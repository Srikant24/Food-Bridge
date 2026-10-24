import { Donation, IDonation } from '../../models/Donation';
import { DonationRequest } from '../../models/DonationRequest';
import { User } from '../../models/User';
import { Organization } from '../../models/Organization';
import { NotificationQueue } from './notificationQueue';
import { TemplateRenderer } from './templateRenderer';

export interface ExpiryCheckSummary {
  checkedAt: Date;
  activeDonationsInspected: number;
  expiringWarningsSent: number;
  expiredDonationsClosed: number;
  delayedPickupsFlagged: number;
}

export class ExpiryScheduler {
  private static timer: NodeJS.Timeout | null = null;

  /**
   * Start recurring background monitoring (every 5 minutes)
   */
  public static start(intervalMs = 5 * 60 * 1000): void {
    if (this.timer) return;
    console.log(`⏰ Expiry and urgent safety alert scheduler active (polling every ${intervalMs / 1000}s)`);
    this.timer = setInterval(() => {
      this.runExpiryCheck().catch(err => console.warn('Expiry scheduler run notice:', err));
    }, intervalMs);
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Main audit scan enforcing food safety deadlines and dispatching proactive warnings
   */
  public static async runExpiryCheck(): Promise<ExpiryCheckSummary> {
    const now = new Date();
    const summary: ExpiryCheckSummary = {
      checkedAt: now,
      activeDonationsInspected: 0,
      expiringWarningsSent: 0,
      expiredDonationsClosed: 0,
      delayedPickupsFlagged: 0,
    };

    // 1. Fetch active donations
    const activeDonations = await Donation.find({
      status: { $in: ['available', 'requested', 'accepted', 'pickup_scheduled'] },
    }).exec();

    summary.activeDonationsInspected = activeDonations.length;

    for (const donation of activeDonations) {
      const deadline = new Date(donation.collectionDeadline);
      const diffMinutes = Math.round((deadline.getTime() - now.getTime()) / 60000);

      // =======================================================================
      // CASE A: Hard Deadline Passed → Safely Close Donation (Food Safety)
      // =======================================================================
      if (deadline.getTime() <= now.getTime()) {
        donation.status = 'expired';
        donation.timeline.push({
          status: 'expired',
          timestamp: now,
          note: 'Safe collection deadline passed. Listing automatically closed to prevent unsafe food distribution.',
          actorName: 'FoodBridge Safety Automation',
          actorRole: 'system',
        });
        await donation.save();
        summary.expiredDonationsClosed++;

        // Reject any pending requests atomically
        await DonationRequest.updateMany(
          { donationId: donation._id, status: 'pending' },
          { $set: { status: 'rejected' } }
        );

        // Notify Provider
        try {
          const providerUser = await User.findById(donation.providerId).exec();
          if (providerUser) {
            const cancelTemplates = TemplateRenderer.renderDonationCancelled({
              donationId: (donation._id as any).toString(),
              foodTitle: donation.title,
              reason: 'Safe collection deadline elapsed. Closed for community health compliance.',
            });

            await NotificationQueue.enqueue({
              userId: (providerUser._id as any).toString(),
              recipientRole: 'provider',
              title: `Donation Closed: ${donation.title} Expired`,
              message: `Safe collection deadline (${deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) passed for "${donation.title}". The listing is now closed.`,
              type: 'cancelled',
              link: `/donations/${donation._id}`,
              relatedEntityId: (donation._id as any).toString(),
              channels: ['in_app', 'email'],
              emailRecipient: providerUser.email,
              phoneRecipient: providerUser.phone,
              dedupKey: `auto_expired_prov_${donation._id}`,
              metadata: { donationId: (donation._id as any).toString() },
              emailRender: cancelTemplates.email,
              smsRender: cancelTemplates.sms,
            });
          }
        } catch (provErr) {
          console.warn('Provider expiry alert notice:', provErr);
        }

        continue;
      }

      // =======================================================================
      // CASE B: Approaching Deadline (< 60 Minutes) → Dispatch Urgent Alert
      // =======================================================================
      if (diffMinutes > 0 && diffMinutes <= 60 && ['available', 'requested'].includes(donation.status)) {
        try {
          const providerUser = await User.findById(donation.providerId).exec();
          if (providerUser) {
            const urgentTemplates = TemplateRenderer.renderDonationExpiringSoon({
              donationId: (donation._id as any).toString(),
              foodTitle: donation.title,
              quantityMeals: donation.quantityMeals,
              minutesRemaining: diffMinutes,
              deadlineTime: deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });

            const res = await NotificationQueue.enqueue({
              userId: (providerUser._id as any).toString(),
              recipientRole: 'provider',
              title: `⚠️ URGENT: Donation Expiring in ${diffMinutes} mins (${donation.title})`,
              message: `Collection window for "${donation.title}" closes in ${diffMinutes} minutes at ${deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
              type: 'expiry_soon',
              link: `/donations/${donation._id}`,
              relatedEntityId: (donation._id as any).toString(),
              channels: ['in_app', 'email', 'sms'],
              emailRecipient: providerUser.email,
              phoneRecipient: providerUser.phone,
              dedupKey: `urgent_warn_prov_${donation._id}`,
              metadata: { donationId: (donation._id as any).toString() },
              emailRender: urgentTemplates.email,
              smsRender: urgentTemplates.sms,
            });

            if (!res.isDuplicate) {
              summary.expiringWarningsSent++;
            }
          }
        } catch (warnErr) {
          console.warn('Expiry warning dispatch notice:', warnErr);
        }
      }

      // =======================================================================
      // CASE C: Delayed Pickup Check
      // =======================================================================
      if (['accepted', 'pickup_scheduled'].includes(donation.status)) {
        const approvedReq = await DonationRequest.findOne({ donationId: donation._id, status: 'approved' }).exec();
        if (approvedReq && approvedReq.estimatedPickupTime) {
          const estTime = new Date(approvedReq.estimatedPickupTime);
          const minutesOverdue = Math.round((now.getTime() - estTime.getTime()) / 60000);

          if (minutesOverdue >= 30) {
            summary.delayedPickupsFlagged++;
            // Flag delayed pickup once with dedup key
            try {
              const ngoUser = await User.findById(approvedReq.ngoId).exec();
              if (ngoUser) {
                await NotificationQueue.enqueue({
                  userId: (ngoUser._id as any).toString(),
                  recipientRole: 'ngo',
                  title: `Delayed Pickup Reminder: ${donation.title}`,
                  message: `Scheduled pickup was estimated for ${estTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (~${minutesOverdue} mins ago). Please update your vehicle coordinator.`,
                  type: 'pickup',
                  link: `/donations/${donation._id}`,
                  channels: ['in_app', 'sms'],
                  emailRecipient: ngoUser.email,
                  phoneRecipient: ngoUser.phone,
                  dedupKey: `delayed_pickup_ngo_${donation._id}`,
                });
              }
            } catch (delErr) {
              console.warn('Delayed pickup alert notice:', delErr);
            }
          }
        }
      }
    }

    return summary;
  }
}
