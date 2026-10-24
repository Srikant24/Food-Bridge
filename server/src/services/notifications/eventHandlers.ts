import { IUser, User } from '../../models/User';
import { IOrganization, Organization } from '../../models/Organization';
import { IDonation } from '../../models/Donation';
import { IDonationRequest } from '../../models/DonationRequest';
import { NotificationQueue } from './notificationQueue';
import { TemplateRenderer } from './templateRenderer';

export class NotificationEventHandlers {
  /**
   * PHASE 2: User Registration Event Handler
   */
  public static async onUserRegistered(params: {
    user: IUser;
    organization: IOrganization;
    sendSms?: boolean;
    simulateGatewayFailure?: boolean;
    forceRetry?: boolean;
  }) {
    const { user, organization, sendSms = true, simulateGatewayFailure, forceRetry } = params;
    const isNgo = user.role === 'ngo';
    const isPending = organization.verificationStatus === 'pending';

    const templates = TemplateRenderer.renderRegistrationWelcome({
      name: user.name,
      organizationName: organization.name,
      email: user.email,
      role: user.role,
    });

    const inAppTitle = isNgo
      ? (isPending ? 'Welcome to FoodBridge — Registration Successful (Pending Verification)' : 'Welcome to FoodBridge — Registration Successful')
      : 'Welcome to FoodBridge — Registration Successful (Account Active)';

    const inAppMessage = isNgo && isPending
      ? `Welcome to FoodBridge! Your NGO account for ${organization.name} has been successfully created. Your organization profile is currently pending verification by platform administrators before you can claim surplus meals.`
      : templates.email.text;

    const channels: ('in_app' | 'email' | 'sms')[] = ['in_app', 'email'];
    if (sendSms && user.phone) {
      channels.push('sms');
    }

    const dedupKey = `reg_confirm_${user._id}`;

    return await NotificationQueue.enqueue({
      userId: (user._id as any).toString(),
      recipientRole: user.role,
      title: inAppTitle,
      message: inAppMessage,
      type: 'registration',
      link: isNgo ? '/ngo/dashboard' : '/provider/dashboard',
      channels,
      emailRecipient: user.email,
      phoneRecipient: user.phone,
      dedupKey,
      templateName: isNgo && isPending ? 'registration_ngo_pending' : 'registration_provider_active',
      metadata: {
        role: user.role,
        organizationName: organization.name,
        verificationStatus: organization.verificationStatus,
      },
      emailRender: templates.email,
      smsRender: templates.sms,
      simulateGatewayFailure,
      forceRetry,
    });
  }

  /**
   * PHASE 2: Account Status Changed (Admin Approved / Rejected)
   */
  public static async onAccountStatusChanged(params: {
    organization: IOrganization;
    action: 'approve' | 'reject';
    notes?: string;
  }) {
    const { organization, action, notes } = params;
    const users = await User.find({ organizationId: organization._id }).exec();
    const results: any[] = [];

    for (const user of users) {
      const isApproved = action === 'approve';
      const templates = isApproved
        ? TemplateRenderer.renderAccountApproved({
            name: user.name,
            organizationName: organization.name,
            role: user.role,
          })
        : TemplateRenderer.renderAccountRejected({
            name: user.name,
            organizationName: organization.name,
            notes,
            role: user.role,
          });

      const res = await NotificationQueue.enqueue({
        userId: (user._id as any).toString(),
        recipientRole: user.role,
        title: templates.email.subject,
        message: templates.email.text,
        type: isApproved ? 'approval' : 'rejection',
        link: user.role === 'ngo' ? '/ngo/dashboard' : '/provider/dashboard',
        channels: ['in_app', 'email', 'sms'],
        emailRecipient: user.email,
        phoneRecipient: user.phone,
        dedupKey: `acc_status_${organization._id}_${user._id}_${action}`,
        templateName: isApproved ? 'account_approved' : 'account_rejected',
        emailRender: templates.email,
        smsRender: templates.sms,
      });

      results.push(res);
    }

    return results;
  }

  /**
   * PHASE 3: Food Listing Created Event Handler
   */
  public static async onDonationCreated(params: {
    donation: IDonation;
    providerUser: IUser;
    eligibleNgos?: Array<{ ngoId: string; ngoName: string; matchScore: number; distanceKm: number | null; phone?: string; email?: string }>;
    simulateGatewayFailure?: boolean;
  }) {
    const { donation, providerUser, eligibleNgos = [], simulateGatewayFailure } = params;
    const results = {
      providerConfirmation: null as any,
      ngoAlerts: [] as any[],
    };

    // 1. Provider Confirmation
    const deadlineStr = new Date(donation.collectionDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const prepStr = new Date(donation.preparationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const provTemplates = TemplateRenderer.renderDonationPublished({
      donationId: (donation._id as any).toString(),
      foodTitle: donation.title,
      category: donation.foodCategory,
      quantityMeals: donation.quantityMeals,
      quantityKg: donation.quantityKg,
      location: donation.location?.address || 'Kitchen Venue',
      prepTime: prepStr,
      deadline: deadlineStr,
    });

    results.providerConfirmation = await NotificationQueue.enqueue({
      userId: (providerUser._id as any).toString(),
      recipientRole: providerUser.role,
      title: provTemplates.email.subject,
      message: provTemplates.email.text,
      type: 'food_alert',
      link: `/donations/${donation._id}`,
      relatedEntityId: (donation._id as any).toString(),
      channels: ['in_app', 'email'],
      emailRecipient: providerUser.email,
      phoneRecipient: providerUser.phone,
      dedupKey: `listing_confirm_prov_${donation._id}`,
      templateName: 'food_listing_provider_confirmation',
      metadata: {
        donationId: (donation._id as any).toString(),
        foodTitle: donation.title,
        quantityMeals: donation.quantityMeals,
        collectionDeadline: donation.collectionDeadline,
      },
      emailRender: provTemplates.email,
      smsRender: provTemplates.sms,
      simulateGatewayFailure,
    });

    // 2. Targeted Alerts to Verified Eligible NGOs
    for (const match of eligibleNgos) {
      const ngoOrg = await Organization.findById(match.ngoId).exec();
      if (!ngoOrg || ngoOrg.verificationStatus !== 'verified') continue;

      const ngoUsers = await User.find({ organizationId: ngoOrg._id, role: 'ngo' }).exec();
      for (const ngoUser of ngoUsers) {
        const ngoTemplates = TemplateRenderer.renderFoodAvailableNearby({
          donationId: (donation._id as any).toString(),
          foodTitle: donation.title,
          quantityMeals: donation.quantityMeals,
          distanceKm: match.distanceKm,
          matchScore: match.matchScore,
          deadline: deadlineStr,
        });

        const alertRes = await NotificationQueue.enqueue({
          userId: (ngoUser._id as any).toString(),
          recipientRole: 'ngo',
          title: ngoTemplates.email.subject,
          message: ngoTemplates.email.text,
          type: 'food_alert',
          link: `/donations/${donation._id}`,
          relatedEntityId: (donation._id as any).toString(),
          channels: ['in_app', 'email', 'sms'],
          emailRecipient: ngoUser.email,
          phoneRecipient: ngoUser.phone,
          dedupKey: `listing_alert_ngo_${donation._id}_${ngoUser._id}`,
          templateName: 'food_listing_ngo_alert',
          metadata: {
            donationId: (donation._id as any).toString(),
            foodTitle: donation.title,
            quantityMeals: donation.quantityMeals,
            distanceKm: match.distanceKm,
            matchScore: match.matchScore,
          },
          emailRender: ngoTemplates.email,
          smsRender: ngoTemplates.sms,
        });

        results.ngoAlerts.push(alertRes);
      }
    }

    return results;
  }

  /**
   * PHASE 4: NGO Collection Request Submitted
   */
  public static async onDonationRequested(params: {
    donation: IDonation;
    request: IDonationRequest;
    providerUser: IUser;
    ngoOrg: IOrganization;
    ngoUser: IUser;
  }) {
    const { donation, request, providerUser, ngoOrg } = params;

    const estStr = new Date(request.estimatedPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const templates = TemplateRenderer.renderCollectionRequest({
      donationId: (donation._id as any).toString(),
      foodTitle: donation.title,
      ngoName: ngoOrg.name,
      quantityMeals: donation.quantityMeals,
      estimatedPickupTime: estStr,
    });

    return await NotificationQueue.enqueue({
      userId: (providerUser._id as any).toString(),
      recipientRole: providerUser.role,
      title: templates.email.subject,
      message: templates.email.text,
      type: 'request',
      link: `/provider/dashboard`,
      relatedEntityId: (donation._id as any).toString(),
      channels: ['in_app', 'email', 'sms'],
      emailRecipient: providerUser.email,
      phoneRecipient: providerUser.phone,
      dedupKey: `req_alert_prov_${request._id}`,
      templateName: 'ngo_request_provider_alert',
      metadata: {
        donationId: (donation._id as any).toString(),
        requestId: (request._id as any).toString(),
        ngoName: ngoOrg.name,
        foodTitle: donation.title,
      },
      emailRender: templates.email,
      smsRender: templates.sms,
    });
  }

  /**
   * PHASE 4: Provider Approves Request
   */
  public static async onDonationRequestApproved(params: {
    donation: IDonation;
    request: IDonationRequest;
    providerUser: IUser;
    ngoOrg: IOrganization;
    ngoUser: IUser;
  }) {
    const { donation, request, providerUser, ngoUser } = params;

    const templates = TemplateRenderer.renderRequestApproved({
      donationId: (donation._id as any).toString(),
      foodTitle: donation.title,
      providerName: donation.pickupContact?.name || providerUser.name,
      contactPhone: donation.pickupContact?.phone || providerUser.phone,
      pickupAddress: donation.location?.address || 'Provider Kitchen Entrance',
      instructions: donation.pickupContact?.pickupInstructions || 'Report to kitchen service bay.',
    });

    return await NotificationQueue.enqueue({
      userId: (ngoUser._id as any).toString(),
      recipientRole: 'ngo',
      title: templates.email.subject,
      message: templates.email.text,
      type: 'approval',
      link: `/donations/${donation._id}`,
      relatedEntityId: (donation._id as any).toString(),
      channels: ['in_app', 'email', 'sms'],
      emailRecipient: ngoUser.email,
      phoneRecipient: ngoUser.phone,
      dedupKey: `req_approved_ngo_${request._id}`,
      templateName: 'request_approved_ngo_alert',
      metadata: {
        donationId: (donation._id as any).toString(),
        requestId: (request._id as any).toString(),
        foodTitle: donation.title,
        pickupOtp: donation.pickupOtp,
      },
      emailRender: templates.email,
      smsRender: templates.sms,
    });
  }

  /**
   * PHASE 4: Provider Rejects Request
   */
  public static async onDonationRequestRejected(params: {
    donation: IDonation;
    request: IDonationRequest;
    ngoUser: IUser;
  }) {
    const { donation, request, ngoUser } = params;

    const templates = TemplateRenderer.renderDonationCancelled({
      donationId: (donation._id as any).toString(),
      foodTitle: donation.title,
      reason: 'The provider allocated this batch to an alternate relief request.',
    });

    return await NotificationQueue.enqueue({
      userId: (ngoUser._id as any).toString(),
      recipientRole: 'ngo',
      title: `Update on Food Request: ${donation.title}`,
      message: `Your request for "${donation.title}" could not be accommodated at this time.`,
      type: 'rejection',
      link: `/donations`,
      relatedEntityId: (donation._id as any).toString(),
      channels: ['in_app', 'email'],
      emailRecipient: ngoUser.email,
      phoneRecipient: ngoUser.phone,
      dedupKey: `req_rejected_ngo_${request._id}`,
      templateName: 'request_rejected_ngo_alert',
      metadata: {
        donationId: (donation._id as any).toString(),
        requestId: (request._id as any).toString(),
        foodTitle: donation.title,
      },
      emailRender: templates.email,
      smsRender: templates.sms,
    });
  }

  /**
   * PHASE 5: Driver Assigned Event Handler
   */
  public static async onDriverAssigned(params: {
    donation: IDonation;
    driverName: string;
    driverPhone: string;
    pickupWindow: string;
    providerUser?: IUser | null;
    ngoUser?: IUser | null;
  }) {
    const { donation, driverName, driverPhone, pickupWindow, providerUser, ngoUser } = params;
    const results: any[] = [];

    const templates = TemplateRenderer.renderDriverAssigned({
      donationId: (donation._id as any).toString(),
      foodTitle: donation.title,
      driverName,
      driverPhone,
      pickupWindow,
    });

    if (providerUser) {
      const res = await NotificationQueue.enqueue({
        userId: (providerUser._id as any).toString(),
        recipientRole: providerUser.role,
        title: templates.email.subject,
        message: templates.email.text,
        type: 'driver_assigned',
        link: `/provider/dashboard`,
        relatedEntityId: (donation._id as any).toString(),
        channels: ['in_app', 'email', 'sms'],
        emailRecipient: providerUser.email,
        phoneRecipient: providerUser.phone,
        dedupKey: `driver_assign_prov_${donation._id}`,
        emailRender: templates.email,
        smsRender: templates.sms,
      });
      results.push(res);
    }

    if (ngoUser) {
      const res = await NotificationQueue.enqueue({
        userId: (ngoUser._id as any).toString(),
        recipientRole: 'ngo',
        title: templates.email.subject,
        message: templates.email.text,
        type: 'driver_assigned',
        link: `/donations/${donation._id}`,
        relatedEntityId: (donation._id as any).toString(),
        channels: ['in_app', 'email', 'sms'],
        emailRecipient: ngoUser.email,
        phoneRecipient: ngoUser.phone,
        dedupKey: `driver_assign_ngo_${donation._id}`,
        emailRender: templates.email,
        smsRender: templates.sms,
      });
      results.push(res);
    }

    return results;
  }

  /**
   * PHASE 5: Pickup Confirmed
   */
  public static async onPickupConfirmed(params: {
    donation: IDonation;
    providerUser?: IUser | null;
    ngoUser?: IUser | null;
  }) {
    const { donation, providerUser, ngoUser } = params;
    const results: any[] = [];

    // Notify Provider
    if (providerUser) {
      const res = await NotificationQueue.enqueue({
        userId: (providerUser._id as any).toString(),
        recipientRole: providerUser.role,
        title: `Food Collected: ${donation.title}`,
        message: `Verification OTP validated! Your donation of ${donation.quantityMeals} meals was successfully collected and is now in transit.`,
        type: 'pickup',
        link: `/provider/dashboard`,
        relatedEntityId: (donation._id as any).toString(),
        channels: ['in_app', 'email'],
        emailRecipient: providerUser.email,
        phoneRecipient: providerUser.phone,
        dedupKey: `pickup_confirm_prov_${donation._id}`,
        templateName: 'pickup_provider_confirmation',
      });
      results.push(res);
    }

    // Notify NGO
    if (ngoUser) {
      const templates = TemplateRenderer.renderPickupConfirmed({
        foodTitle: donation.title,
        quantityMeals: donation.quantityMeals,
        destinationName: 'your community center',
        deliveryOtp: donation.deliveryOtp || '----',
      });

      const res = await NotificationQueue.enqueue({
        userId: (ngoUser._id as any).toString(),
        recipientRole: 'ngo',
        title: templates.email.subject,
        message: templates.email.text,
        type: 'pickup',
        link: `/donations/${donation._id}`,
        relatedEntityId: (donation._id as any).toString(),
        channels: ['in_app', 'email', 'sms'],
        emailRecipient: ngoUser.email,
        phoneRecipient: ngoUser.phone,
        dedupKey: `pickup_confirm_ngo_${donation._id}`,
        emailRender: templates.email,
        smsRender: templates.sms,
      });
      results.push(res);
    }

    return results;
  }

  /**
   * PHASE 5: Delivery Completed & Impact Receipt
   */
  public static async onDeliveryConfirmed(params: {
    donation: IDonation;
    providerUser?: IUser | null;
    ngoUser?: IUser | null;
    recipientOrgName?: string;
  }) {
    const { donation, providerUser, ngoUser, recipientOrgName = 'Community Shelter' } = params;
    const results: any[] = [];
    const co2SavedKg = Math.round(donation.quantityKg * 2.5 * 10) / 10;

    const templates = TemplateRenderer.renderDeliveryCompleted({
      donationId: (donation._id as any).toString(),
      foodTitle: donation.title,
      quantityMeals: donation.quantityMeals,
      quantityKg: donation.quantityKg,
      co2SavedKg,
      recipientOrg: recipientOrgName,
    });

    if (providerUser) {
      const res = await NotificationQueue.enqueue({
        userId: (providerUser._id as any).toString(),
        recipientRole: providerUser.role,
        title: templates.email.subject,
        message: templates.email.text,
        type: 'delivery',
        link: `/provider/dashboard`,
        relatedEntityId: (donation._id as any).toString(),
        channels: ['in_app', 'email', 'sms'],
        emailRecipient: providerUser.email,
        phoneRecipient: providerUser.phone,
        dedupKey: `deliv_confirm_prov_${donation._id}`,
        templateName: 'delivery_provider_completed',
        metadata: {
          donationId: (donation._id as any).toString(),
          mealsServed: donation.quantityMeals,
          kgRescued: donation.quantityKg,
          co2SavedKg,
        },
        emailRender: templates.email,
        smsRender: templates.sms,
      });
      results.push(res);
    }

    if (ngoUser) {
      const res = await NotificationQueue.enqueue({
        userId: (ngoUser._id as any).toString(),
        recipientRole: 'ngo',
        title: `Delivery Completed: ${donation.title}`,
        message: `Food redistribution verified! ${donation.quantityMeals} meals are now recorded in your organization's impact history.`,
        type: 'delivery',
        link: `/donations/${donation._id}`,
        relatedEntityId: (donation._id as any).toString(),
        channels: ['in_app', 'email'],
        emailRecipient: ngoUser.email,
        phoneRecipient: ngoUser.phone,
        dedupKey: `deliv_confirm_ngo_${donation._id}`,
        templateName: 'delivery_ngo_completed',
        emailRender: templates.email,
        smsRender: templates.sms,
      });
      results.push(res);
    }

    return results;
  }
}
