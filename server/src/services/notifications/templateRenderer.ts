/**
 * FoodBridge Notification Template Engine
 * 
 * Visual Identity:
 * - Forest Green: #14532D
 * - Cream Background: #F7F3E9
 * - Warm White Card: #FFFFFF
 * - Dark Charcoal Text: #17212F
 * - Accent Amber / Orange: #D97706
 */

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
}

export interface SmsRenderOutput {
  message: string;
  dltTemplateId?: string;
  senderId: string;
}

// Reusable responsive email layout shell
const renderEmailShell = (title: string, preheader: string, contentHtml: string): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F7F3E9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17212F; }
    table { border-spacing: 0; }
    td { padding: 0; }
    img { border: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #F7F3E9; padding-bottom: 40px; }
    .main { background-color: #FFFFFF; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; border-radius: 16px; overflow: hidden; border: 1px solid #E5E0D0; box-shadow: 0 4px 16px rgba(20, 83, 45, 0.06); }
    .header { background: linear-gradient(135deg, #14532D 0%, #166534 100%); padding: 32px 24px; text-align: center; }
    .brand-badge { display: inline-block; background-color: rgba(255,255,255,0.15); color: #F7F3E9; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 999px; margin-bottom: 8px; }
    .brand-title { color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
    .brand-subtitle { color: #E2EDE5; font-size: 13px; margin: 4px 0 0 0; }
    .content { padding: 32px 28px; }
    .heading { color: #14532D; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; }
    .paragraph { color: #2D3748; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }
    .info-card { background-color: #F8FAF7; border: 1px solid #DCE6D9; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #EDF2EC; font-size: 13.5px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #526359; font-weight: 600; }
    .info-value { color: #14532D; font-weight: 700; text-align: right; }
    .btn-container { text-align: center; margin: 28px 0 12px 0; }
    .btn { display: inline-block; background-color: #14532D; color: #FFFFFF !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 10px; box-shadow: 0 2px 8px rgba(20,83,45,0.25); }
    .footer { text-align: center; padding: 24px; color: #718096; font-size: 12px; line-height: 1.5; }
    .footer a { color: #14532D; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <span style="display:none;font-size:0px;line-height:0px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>
  <center class="wrapper">
    <table class="main" width="100%">
      <tr>
        <td class="header">
          <div class="brand-badge">Food Waste Rescue Platform</div>
          <h1 class="brand-title">FoodBridge</h1>
          <p class="brand-subtitle">Rescue Food. Restore Hope.</p>
        </td>
      </tr>
      <tr>
        <td class="content">
          ${contentHtml}
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p style="margin: 0 0 8px 0;">This is an automated operational notification from FoodBridge.</p>
          <p style="margin: 0;">Zero Food Waste Redistribution Network • India Operations</p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

export class TemplateRenderer {
  // DLT Registered Sender ID for Indian Telephony Standards
  public static readonly DLT_SENDER_ID = 'FDBRDG';

  /**
   * Dedicated Canonical Registration Welcome Email (Provider & NGO)
   * Subject: Welcome to FoodBridge — Registration Successful
   */
  public static renderRegistrationWelcome(data: {
    name: string;
    organizationName: string;
    email: string;
    role: string;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { name, organizationName, email, role, appUrl = process.env.CLIENT_URL || 'http://localhost:5173' } = data;
    const roleDisplay = role === 'provider' ? 'Food Provider' : role === 'ngo' ? 'NGO' : role;

    const emailSubject = 'Welcome to FoodBridge — Registration Successful';

    const emailText = `Hello ${name},

Welcome to FoodBridge!

Your ${roleDisplay} account has been successfully created.

Organization: ${organizationName}
Registered Email: ${email}
Account Role: ${roleDisplay}

You can now sign in and access your FoodBridge dashboard.

Together, we can reduce food waste and help more communities.

Thank you,
Team FoodBridge`;

    const emailHtml = renderEmailShell(
      emailSubject,
      `Your ${roleDisplay} account has been successfully created on FoodBridge.`,
      `<h2 class="heading">Hello ${name},</h2>
      <p class="paragraph" style="font-size: 16px; font-weight: 600; color: #14532D;">Welcome to FoodBridge!</p>
      <p class="paragraph">Your <strong>${roleDisplay}</strong> account has been successfully created.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Organization:</span><span class="info-value">${organizationName}</span></div>
        <div class="info-row"><span class="info-label">Registered Email:</span><span class="info-value">${email}</span></div>
        <div class="info-row"><span class="info-label">Account Role:</span><span class="info-value">${roleDisplay}</span></div>
      </div>
      <p class="paragraph">You can now sign in and access your FoodBridge dashboard.</p>
      <p class="paragraph">Together, we can reduce food waste and help more communities.</p>
      <div class="btn-container"><a href="${appUrl}/login" class="btn">Sign In to Dashboard</a></div>
      <p class="paragraph" style="margin-top: 28px; font-size: 14px; color: #526359;">Thank you,<br/><strong style="color: #14532D;">Team FoodBridge</strong></p>`
    );

    const smsMessage = `FoodBridge: Welcome ${name}! Your ${roleDisplay} account has been created. Sign in: ${appUrl}/login - FDBRDG`;

    return {
      email: { subject: emailSubject, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_REG_SUCCESS_01' },
    };
  }

  /**
   * 1. Welcome to FoodBridge (Provider, Supplier, Delivery Partner)
   */
  public static renderWelcome(data: { name: string; organizationName: string; role: string; appUrl?: string }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { name, organizationName, role, appUrl = 'http://localhost:5173' } = data;
    const roleDisplay = role === 'provider' ? 'Food Provider' : role === 'supplier' ? 'Food Supplier' : 'Delivery Volunteer';

    const emailHtml = renderEmailShell(
      `Welcome to FoodBridge — ${organizationName}`,
      `Your account as ${roleDisplay} is now active on FoodBridge.`,
      `<h2 class="heading">Welcome to the Movement, ${name}!</h2>
      <p class="paragraph">Your organization <strong>${organizationName}</strong> is registered as a verified <strong>${roleDisplay}</strong> on FoodBridge.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Organization</span><span class="info-value">${organizationName}</span></div>
        <div class="info-row"><span class="info-label">Registered Role</span><span class="info-value">${roleDisplay}</span></div>
        <div class="info-row"><span class="info-label">Account Status</span><span class="info-value" style="color: #15803D;">Active & Verified</span></div>
      </div>
      <p class="paragraph">You can now list surplus meals, coordinate with local verified shelters, and prevent food waste across your community.</p>
      <div class="btn-container"><a href="${appUrl}/login" class="btn">Open Your Dashboard</a></div>`
    );

    const emailText = `Welcome to FoodBridge, ${name}!\n\nYour organization ${organizationName} is registered as a ${roleDisplay} on FoodBridge. Account status: Active.\n\nAccess dashboard: ${appUrl}/login`;
    const smsMessage = `FoodBridge: Welcome ${name}! Your ${roleDisplay} account for ${organizationName} is active. Access dashboard: ${appUrl}/login - FDBRDG`;

    return {
      email: { subject: `Welcome to FoodBridge — ${organizationName} Account Active`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_REG_ACTIVE_01' },
    };
  }

  /**
   * 2. Registration Pending Verification (NGOs)
   */
  public static renderRegistrationPending(data: { name: string; organizationName: string; maxMealsPerDay?: number; appUrl?: string }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { name, organizationName, maxMealsPerDay = 150, appUrl = 'http://localhost:5173' } = data;

    const emailHtml = renderEmailShell(
      `Application Received — ${organizationName}`,
      `Your NGO registration has been submitted and is pending administrator review.`,
      `<h2 class="heading">NGO Application Received</h2>
      <p class="paragraph">Hello ${name}, thank you for registering <strong>${organizationName}</strong> on the FoodBridge platform.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">NGO / Shelter</span><span class="info-value">${organizationName}</span></div>
        <div class="info-row"><span class="info-label">Daily Capacity</span><span class="info-value">${maxMealsPerDay} meals</span></div>
        <div class="info-row"><span class="info-label">Verification Status</span><span class="info-value" style="color: #D97706;">Pending Admin Review</span></div>
      </div>
      <p class="paragraph">To maintain food safety and compliance with non-profit standards, an operations administrator will verify your organization details within 24 hours. You will receive an alert as soon as verification is approved.</p>
      <div class="btn-container"><a href="${appUrl}/login" class="btn">View Application Status</a></div>`
    );

    const emailText = `Hello ${name},\n\nYour NGO registration for ${organizationName} has been received and is pending administrator verification. You will be notified as soon as review is completed.\n\nStatus: ${appUrl}/login`;
    const smsMessage = `FoodBridge: NGO registration for ${organizationName} received. Your application is pending admin verification. You will receive an SMS upon approval. - FDBRDG`;

    return {
      email: { subject: `Welcome to FoodBridge — NGO Application Submitted (${organizationName})`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_REG_PENDING_02' },
    };
  }

  /**
   * 3. Account Approved
   */
  public static renderAccountApproved(data: { name: string; organizationName: string; role?: string; appUrl?: string }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { name, organizationName, role = 'ngo', appUrl = process.env.CLIENT_URL || 'http://localhost:5173' } = data;
    const isProvider = role === 'provider';
    const targetDashboard = isProvider ? `${appUrl}/provider/dashboard` : `${appUrl}/ngo/dashboard`;
    const actionLabel = isProvider ? 'Create Food Donation' : 'Explore Available Food';
    const actionUrl = isProvider ? `${appUrl}/donations/create` : `${appUrl}/ngo/dashboard`;

    const descriptionText = isProvider
      ? 'You can now publish surplus food listings, manage donations, and coordinate collections with verified NGOs in your service radius.'
      : 'You are now eligible to receive real-time surplus food alerts and request collections from hotels, banquets, and caterers in your service radius.';

    const emailHtml = renderEmailShell(
      `Account Verified — ${organizationName}`,
      `Your FoodBridge account has been verified by administrators.`,
      `<h2 class="heading" style="color: #15803D;">🎉 Your Account is Approved!</h2>
      <p class="paragraph">Hello ${name}, great news! <strong>${organizationName}</strong> has been officially verified and approved by the FoodBridge operations team.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Organization</span><span class="info-value">${organizationName}</span></div>
        <div class="info-row"><span class="info-label">Verification Status</span><span class="info-value" style="color: #15803D;">100% Verified</span></div>
        <div class="info-row"><span class="info-label">Account Role</span><span class="info-value">${isProvider ? 'Food Provider' : 'NGO / Shelter'}</span></div>
        <div class="info-row"><span class="info-label">Surplus Operations</span><span class="info-value" style="color: #15803D;">Full Access Activated</span></div>
      </div>
      <p class="paragraph">${descriptionText}</p>
      <div class="btn-container"><a href="${actionUrl}" class="btn">${actionLabel}</a></div>`
    );

    const emailText = `Congratulations ${name}!\n\n${organizationName} has been approved by administrators. ${descriptionText}\n\nAccess Dashboard: ${targetDashboard}`;
    const smsMessage = `FoodBridge: Congratulations! ${organizationName} is officially verified. Access: ${targetDashboard} - FDBRDG`;

    return {
      email: { subject: `🎉 Account Approved: Welcome to FoodBridge (${organizationName})`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_ACC_APPROVED_03' },
    };
  }

  public static renderAccountRejected(data: { name: string; organizationName: string; notes?: string; role?: string; appUrl?: string }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { name, organizationName, notes, role = 'provider', appUrl = process.env.CLIENT_URL || 'http://localhost:5173' } = data;
    const isProvider = role === 'provider';
    const targetDashboard = isProvider ? `${appUrl}/provider/dashboard` : `${appUrl}/ngo/dashboard`;
    const reasonText = notes || 'Documentation requirements not met or facility credentials could not be verified.';

    const emailHtml = renderEmailShell(
      `Update on FoodBridge Verification — ${organizationName}`,
      `Your verification application could not be approved at this time.`,
      `<h2 class="heading" style="color: #B91C1C;">Verification Application Update</h2>
      <p class="paragraph">Hello ${name}, thank you for registering <strong>${organizationName}</strong> on FoodBridge.</p>
      <div class="info-card" style="border-left: 4px solid #B91C1C;">
        <div class="info-row"><span class="info-label">Organization:</span><span class="info-value">${organizationName}</span></div>
        <div class="info-row"><span class="info-label">Review Status:</span><span class="info-value" style="color: #B91C1C;">Not Approved</span></div>
        <div class="info-row"><span class="info-label">Review Notes:</span><span class="info-value">${reasonText}</span></div>
      </div>
      <p class="paragraph">For food safety compliance and governance, our administrators require verified credentials before surplus food operations can proceed. You may sign in to review your profile or reach out to our compliance team.</p>
      <div class="btn-container"><a href="${targetDashboard}" class="btn" style="background-color: #374151;">View Dashboard</a></div>`
    );

    const emailText = `Hello ${name},\n\nYour application for ${organizationName} could not be approved at this time. Reason: ${reasonText}\n\nPlease review your account: ${targetDashboard}`;
    const smsMessage = `FoodBridge: Your application for ${organizationName} was not approved (${reasonText}). - FDBRDG`;

    return {
      email: { subject: `Update on FoodBridge Verification: ${organizationName}`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_ACC_REJECTED_14' },
    };
  }

  /**
   * 4. Food Donation Published (Provider Confirmation)
   */
  public static renderDonationPublished(data: {
    donationId: string;
    foodTitle: string;
    category: string;
    quantityMeals: number;
    quantityKg: number;
    location: string;
    prepTime: string;
    deadline: string;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { donationId, foodTitle, category, quantityMeals, quantityKg, location, prepTime, deadline, appUrl = 'http://localhost:5173' } = data;

    const emailHtml = renderEmailShell(
      `Surplus Listing Confirmed — ${foodTitle}`,
      `Your food donation of ${quantityMeals} meals is now live on FoodBridge.`,
      `<h2 class="heading">Surplus Food Listing Confirmed</h2>
      <p class="paragraph">Thank you for preventing food waste! Your surplus listing is now active and the AI matching engine is notifying verified shelters nearby.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Food Item</span><span class="info-value">${foodTitle}</span></div>
        <div class="info-row"><span class="info-label">Quantity</span><span class="info-value">${quantityMeals} meals (~${quantityKg} kg)</span></div>
        <div class="info-row"><span class="info-label">Category</span><span class="info-value">${category}</span></div>
        <div class="info-row"><span class="info-label">Pickup Address</span><span class="info-value">${location}</span></div>
        <div class="info-row"><span class="info-label">Preparation Time</span><span class="info-value">${prepTime}</span></div>
        <div class="info-row"><span class="info-label">Collection Deadline</span><span class="info-value" style="color: #DC2626;">${deadline}</span></div>
      </div>
      <div class="btn-container"><a href="${appUrl}/donations/${donationId}" class="btn">View Live Listing</a></div>`
    );

    const emailText = `Surplus Listing Confirmed!\n\nFood: ${foodTitle}\nQuantity: ${quantityMeals} meals (~${quantityKg} kg)\nDeadline: ${deadline}\nLocation: ${location}\n\nTrack: ${appUrl}/donations/${donationId}`;
    const smsMessage = `FoodBridge: Donation of ${quantityMeals} meals (${foodTitle}) published successfully. Collection deadline: ${deadline}. Track: ${appUrl}/donations/${donationId} - FDBRDG`;

    return {
      email: { subject: `Surplus Food Listing Confirmed: ${foodTitle} (${quantityMeals} meals)`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_LISTING_CONFIRM_04' },
    };
  }

  /**
   * 5. New Food Available Nearby (Targeted NGO Alert)
   */
  public static renderFoodAvailableNearby(data: {
    donationId: string;
    foodTitle: string;
    quantityMeals: number;
    distanceKm: number | null;
    matchScore: number;
    deadline: string;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { donationId, foodTitle, quantityMeals, distanceKm, matchScore, deadline, appUrl = 'http://localhost:5173' } = data;
    const distStr = distanceKm !== null && distanceKm !== undefined ? `~${distanceKm} km from your center` : 'In your service area';
    const distSummary = distanceKm !== null && distanceKm !== undefined ? `~${distanceKm} km away` : 'nearby';

    const emailHtml = renderEmailShell(
      `Surplus Food Alert — ${quantityMeals} Meals Nearby`,
      `Verified surplus meals match your shelter's capacity and dietary requirements.`,
      `<h2 class="heading" style="color: #15803D;">🚨 Surplus Food Alert Nearby</h2>
      <p class="paragraph">A fresh batch of surplus food matching your shelter profile has just been published.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Food Available</span><span class="info-value">${foodTitle}</span></div>
        <div class="info-row"><span class="info-label">Quantity</span><span class="info-value">${quantityMeals} meals</span></div>
        <div class="info-row"><span class="info-label">Distance</span><span class="info-value">${distStr}</span></div>
        <div class="info-row"><span class="info-label">Suitability Match</span><span class="info-value" style="color: #15803D;">${matchScore}% Match</span></div>
        <div class="info-row"><span class="info-label">Collection Window Closes</span><span class="info-value" style="color: #DC2626;">${deadline}</span></div>
      </div>
      <p class="paragraph">Review safety specifications, storage temperature requirements, and claim the donation before deadline.</p>
      <div class="btn-container"><a href="${appUrl}/donations/${donationId}" class="btn">Claim Food for Shelter</a></div>`
    );

    const emailText = `Surplus Food Alert!\n\n${quantityMeals} meals of "${foodTitle}" available (${distSummary}). Deadline: ${deadline}.\n\nClaim now: ${appUrl}/donations/${donationId}`;
    const smsMessage = `FoodBridge: Alert! ${quantityMeals} surplus meals (${foodTitle}) available (${distSummary}). Deadline: ${deadline}. Request pickup: ${appUrl}/donations/${donationId} - FDBRDG`;

    return {
      email: { subject: `🚨 Surplus Food Alert: ${quantityMeals} Meals Available Nearby (${foodTitle})`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_SURPLUS_ALERT_05' },
    };
  }

  /**
   * 6. NGO Collection Request (Provider Alert)
   */
  public static renderCollectionRequest(data: {
    donationId: string;
    foodTitle: string;
    ngoName: string;
    quantityMeals: number;
    estimatedPickupTime: string;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { donationId, foodTitle, ngoName, quantityMeals, estimatedPickupTime, appUrl = 'http://localhost:5173' } = data;

    const emailHtml = renderEmailShell(
      `Incoming Collection Request — ${ngoName}`,
      `${ngoName} has requested to collect ${foodTitle}.`,
      `<h2 class="heading">New Food Collection Request</h2>
      <p class="paragraph">Verified NGO <strong>${ngoName}</strong> has submitted a collection request for your surplus food.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Requesting NGO</span><span class="info-value">${ngoName}</span></div>
        <div class="info-row"><span class="info-label">Food Batch</span><span class="info-value">${foodTitle} (${quantityMeals} meals)</span></div>
        <div class="info-row"><span class="info-label">Estimated Arrival</span><span class="info-value">${estimatedPickupTime}</span></div>
      </div>
      <p class="paragraph">Please review the request and approve to lock in the pickup schedule and generate the pickup verification OTP.</p>
      <div class="btn-container"><a href="${appUrl}/provider/dashboard" class="btn">Approve Collection Request</a></div>`
    );

    const emailText = `New Collection Request!\n\n${ngoName} requested "${foodTitle}" (${quantityMeals} meals). Estimated pickup: ${estimatedPickupTime}.\n\nApprove in dashboard: ${appUrl}/provider/dashboard`;
    const smsMessage = `FoodBridge: ${ngoName} requested to collect "${foodTitle}" (${quantityMeals} meals) around ${estimatedPickupTime}. Review and approve: ${appUrl}/provider/dashboard - FDBRDG`;

    return {
      email: { subject: `New Food Collection Request: ${ngoName} (${foodTitle})`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_REQ_ALERT_06' },
    };
  }

  /**
   * 7. Collection Request Approved (NGO Alert)
   */
  public static renderRequestApproved(data: {
    donationId: string;
    foodTitle: string;
    providerName: string;
    contactPhone: string;
    pickupAddress: string;
    instructions: string;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { donationId, foodTitle, providerName, contactPhone, pickupAddress, instructions, appUrl = 'http://localhost:5173' } = data;

    const emailHtml = renderEmailShell(
      `Request Approved — ${foodTitle}`,
      `Your collection request has been approved by the food provider.`,
      `<h2 class="heading" style="color: #15803D;">🎉 Food Request Approved!</h2>
      <p class="paragraph">The food provider has approved your collection request for <strong>${foodTitle}</strong>.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Food Provider</span><span class="info-value">${providerName}</span></div>
        <div class="info-row"><span class="info-label">Pickup Address</span><span class="info-value">${pickupAddress}</span></div>
        <div class="info-row"><span class="info-label">Provider Contact</span><span class="info-value">${contactPhone}</span></div>
        <div class="info-row"><span class="info-label">Handover Instructions</span><span class="info-value">${instructions}</span></div>
      </div>
      <p class="paragraph"><strong>Important Security Notice:</strong> Upon arriving at the venue, obtain the 4-digit secret Pickup OTP verbally from the food provider to verify handover on your dashboard.</p>
      <div class="btn-container"><a href="${appUrl}/donations/${donationId}" class="btn">View Pickup Coordinates & Details</a></div>`
    );

    const emailText = `Request Approved!\n\nYour request for "${foodTitle}" has been approved by ${providerName}.\nPickup at: ${pickupAddress}\nContact: ${contactPhone}\nInstructions: ${instructions}\nOTP: Obtain the 4-digit pickup OTP from provider on site.\n\nView details: ${appUrl}/donations/${donationId}`;
    const smsMessage = `FoodBridge: Request approved for "${foodTitle}"! Pickup address: ${pickupAddress}. Contact: ${contactPhone}. Obtain 4-digit OTP upon arrival: ${appUrl}/donations/${donationId} - FDBRDG`;

    return {
      email: { subject: `🎉 Food Request Approved: ${foodTitle}`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_REQ_APPROVED_07' },
    };
  }

  /**
   * 8. Driver Assigned
   */
  public static renderDriverAssigned(data: {
    donationId: string;
    foodTitle: string;
    driverName: string;
    driverPhone: string;
    pickupWindow: string;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { donationId, foodTitle, driverName, driverPhone, pickupWindow, appUrl = 'http://localhost:5173' } = data;

    const emailHtml = renderEmailShell(
      `Driver Assigned — ${foodTitle}`,
      `A volunteer driver has been assigned for food transport.`,
      `<h2 class="heading">Delivery Driver Dispatched</h2>
      <p class="paragraph">A volunteer transport driver has been scheduled for <strong>${foodTitle}</strong>.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Driver Name</span><span class="info-value">${driverName}</span></div>
        <div class="info-row"><span class="info-label">Driver Contact</span><span class="info-value">${driverPhone}</span></div>
        <div class="info-row"><span class="info-label">Scheduled Window</span><span class="info-value">${pickupWindow}</span></div>
      </div>
      <div class="btn-container"><a href="${appUrl}/donations/${donationId}" class="btn">Track Vehicle Status</a></div>`
    );

    const emailText = `Driver Assigned!\n\nDriver ${driverName} (${driverPhone}) is scheduled to pick up "${foodTitle}" during ${pickupWindow}.\n\nTrack: ${appUrl}/donations/${donationId}`;
    const smsMessage = `FoodBridge: Driver ${driverName} (${driverPhone}) assigned for "${foodTitle}". Expected arrival: ${pickupWindow}. Track: ${appUrl}/donations/${donationId} - FDBRDG`;

    return {
      email: { subject: `Driver Assigned: ${foodTitle} Transport (${driverName})`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_DRIVER_ASSIGNED_08' },
    };
  }

  /**
   * 9. Pickup Confirmed (OTP Handover Verified)
   */
  public static renderPickupConfirmed(data: {
    foodTitle: string;
    quantityMeals: number;
    destinationName: string;
    deliveryOtp: string;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { foodTitle, quantityMeals, destinationName, deliveryOtp, appUrl = 'http://localhost:5173' } = data;

    const emailHtml = renderEmailShell(
      `Food Collected & In Transit — ${foodTitle}`,
      `Pickup OTP verified. Meals are now in transit.`,
      `<h2 class="heading" style="color: #15803D;">Food Collected & In Transit</h2>
      <p class="paragraph">The 4-digit pickup OTP was successfully validated on-site. <strong>${quantityMeals} meals</strong> of ${foodTitle} are now in transit to <strong>${destinationName}</strong>.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Food Batch</span><span class="info-value">${foodTitle}</span></div>
        <div class="info-row"><span class="info-label">Quantity</span><span class="info-value">${quantityMeals} meals</span></div>
        <div class="info-row"><span class="info-label">Destination</span><span class="info-value">${destinationName}</span></div>
        <div class="info-row"><span class="info-label">Arrival Delivery OTP</span><span class="info-value" style="font-size:16px;letter-spacing:2px;">[${deliveryOtp}]</span></div>
      </div>
      <p class="paragraph">The driver will ask the receiving NGO coordinator for this 4-digit Delivery OTP upon arrival at the shelter.</p>`
    );

    const emailText = `Food Collected!\n\n${quantityMeals} meals of "${foodTitle}" are now in transit to ${destinationName}.\nDelivery OTP: ${deliveryOtp}`;
    const smsMessage = `FoodBridge: ${quantityMeals} meals of "${foodTitle}" picked up and in transit to ${destinationName}. Delivery OTP upon arrival is ${deliveryOtp}. - FDBRDG`;

    return {
      email: { subject: `Pickup Confirmed: ${foodTitle} In Transit`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_PICKUP_CONFIRMED_09' },
    };
  }

  /**
   * 10. Delivery In Progress
   */
  public static renderDeliveryInProgress(data: {
    foodTitle: string;
    quantityMeals: number;
    etaMinutes: number;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { foodTitle, quantityMeals, etaMinutes, appUrl = 'http://localhost:5173' } = data;

    const emailHtml = renderEmailShell(
      `Approaching Delivery — ${foodTitle}`,
      `Vehicle arriving in approximately ${etaMinutes} minutes.`,
      `<h2 class="heading">Delivery Arriving Soon</h2>
      <p class="paragraph">The food rescue vehicle with <strong>${quantityMeals} meals</strong> of ${foodTitle} is approximately <strong>${etaMinutes} minutes away</strong>.</p>
      <p class="paragraph">Please have staff ready with insulated storage or warming trays to receive the containers.</p>`
    );

    const emailText = `Delivery Arriving Soon!\n\n${quantityMeals} meals of "${foodTitle}" arriving in approx ${etaMinutes} mins. Please prepare staff to receive containers.`;
    const smsMessage = `FoodBridge: Food delivery for "${foodTitle}" (${quantityMeals} meals) arriving in approx ${etaMinutes} mins. Please prepare to receive. - FDBRDG`;

    return {
      email: { subject: `Delivery Arriving Soon: ${foodTitle} (ETA ~${etaMinutes} mins)`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_DELIV_PROGRESS_10' },
    };
  }

  /**
   * 11. Delivery Completed & Impact Receipt
   */
  public static renderDeliveryCompleted(data: {
    donationId: string;
    foodTitle: string;
    quantityMeals: number;
    quantityKg: number;
    co2SavedKg: number;
    recipientOrg: string;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { donationId, foodTitle, quantityMeals, quantityKg, co2SavedKg, recipientOrg, appUrl = 'http://localhost:5173' } = data;

    const emailHtml = renderEmailShell(
      `Delivery Receipt & Impact — ${foodTitle}`,
      `Food rescue mission completed! Verified impact: ${quantityMeals} meals served.`,
      `<h2 class="heading" style="color: #15803D;">Mission Accomplished!</h2>
      <p class="paragraph">Your surplus food was successfully delivered to community recipients at <strong>${recipientOrg}</strong>.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Meals Distributed</span><span class="info-value" style="color:#15803D;">${quantityMeals} meals</span></div>
        <div class="info-row"><span class="info-label">Food Rescued</span><span class="info-value">${quantityKg} kg</span></div>
        <div class="info-row"><span class="info-label">CO2 Emissions Avoided</span><span class="info-value">~${co2SavedKg} kg CO2e</span></div>
        <div class="info-row"><span class="info-label">Recipient Community</span><span class="info-value">${recipientOrg}</span></div>
      </div>
      <p class="paragraph">A formal digital redistribution receipt has been generated and archived in your organization profile.</p>
      <div class="btn-container"><a href="${appUrl}/donations/${donationId}" class="btn">View Digital Impact Receipt</a></div>`
    );

    const emailText = `Mission Accomplished!\n\n${quantityMeals} meals served (${quantityKg} kg) of "${foodTitle}" safely delivered to ${recipientOrg}. Avoided ~${co2SavedKg} kg CO2 emissions!\n\nReceipt: ${appUrl}/donations/${donationId}`;
    const smsMessage = `FoodBridge: Mission Accomplished! ${quantityMeals} meals (${foodTitle}) delivered to ${recipientOrg}. Impact: ~${co2SavedKg} kg CO2 avoided. Thank you! - FDBRDG`;

    return {
      email: { subject: `Mission Accomplished: ${foodTitle} Delivered! (${quantityMeals} meals served)`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_DELIV_COMPLETED_11' },
    };
  }

  /**
   * 12. Donation Expiring Soon (Urgent Alert)
   */
  public static renderDonationExpiringSoon(data: {
    donationId: string;
    foodTitle: string;
    quantityMeals: number;
    minutesRemaining: number;
    deadlineTime: string;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { donationId, foodTitle, quantityMeals, minutesRemaining, deadlineTime, appUrl = 'http://localhost:5173' } = data;

    const emailHtml = renderEmailShell(
      `Urgent Expiry Alert — ${foodTitle}`,
      `Only ${minutesRemaining} minutes remaining before safe collection window closes.`,
      `<h2 class="heading" style="color: #DC2626;">⚠️ Urgent: Food Collection Window Expiring Soon</h2>
      <p class="paragraph">The safe food redistribution window for <strong>${foodTitle}</strong> (${quantityMeals} meals) closes at <strong>${deadlineTime}</strong> (${minutesRemaining} minutes remaining).</p>
      <div class="info-card" style="border-color: #FECACA; background-color: #FEF2F2;">
        <div class="info-row"><span class="info-label">Food Batch</span><span class="info-value">${foodTitle}</span></div>
        <div class="info-row"><span class="info-label">Quantity at Risk</span><span class="info-value" style="color: #DC2626;">${quantityMeals} meals</span></div>
        <div class="info-row"><span class="info-label">Hard Deadline</span><span class="info-value" style="color: #DC2626;">${deadlineTime}</span></div>
      </div>
      <p class="paragraph">To guarantee food safety, donations that pass their collection deadline will be automatically closed and cannot be distributed.</p>
      <div class="btn-container"><a href="${appUrl}/donations/${donationId}" class="btn" style="background-color: #DC2626;">Claim Immediate Pickup</a></div>`
    );

    const emailText = `URGENT FOOD EXPIRY ALERT!\n\n${quantityMeals} meals of "${foodTitle}" will expire in ${minutesRemaining} minutes (${deadlineTime}).\n\nClaim now: ${appUrl}/donations/${donationId}`;
    const smsMessage = `FoodBridge URGENT: Only ${minutesRemaining} mins left to claim ${quantityMeals} meals of "${foodTitle}". Collection deadline: ${deadlineTime}. Claim now: ${appUrl}/donations/${donationId} - FDBRDG`;

    return {
      email: { subject: `⚠️ URGENT: Donation Expiring in ${minutesRemaining} mins (${foodTitle})`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_EXPIRY_SOON_12' },
    };
  }

  /**
   * 13. Donation Cancelled
   */
  public static renderDonationCancelled(data: {
    donationId: string;
    foodTitle: string;
    reason: string;
    appUrl?: string;
  }): { email: EmailRenderOutput; sms: SmsRenderOutput } {
    const { donationId, foodTitle, reason, appUrl = 'http://localhost:5173' } = data;

    const emailHtml = renderEmailShell(
      `Donation Cancelled — ${foodTitle}`,
      `The food donation has been withdrawn or cancelled.`,
      `<h2 class="heading" style="color: #4A5568;">Donation Withdrawn / Cancelled</h2>
      <p class="paragraph">The surplus food donation <strong>"${foodTitle}"</strong> has been cancelled by the provider or closed due to food safety constraints.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Food Listing</span><span class="info-value">${foodTitle}</span></div>
        <div class="info-row"><span class="info-label">Closure Reason</span><span class="info-value">${reason || 'Withdrawn by provider or deadline elapsed.'}</span></div>
      </div>
      <p class="paragraph">Please check the FoodBridge dashboard for other available donations matching your community shelter.</p>
      <div class="btn-container"><a href="${appUrl}/donations" class="btn">Explore Available Food</a></div>`
    );

    const emailText = `Donation Cancelled.\n\n"${foodTitle}" has been cancelled (${reason}).\n\nExplore other listings: ${appUrl}/donations`;
    const smsMessage = `FoodBridge: Surplus listing "${foodTitle}" has been cancelled (${reason}). Browse other meals: ${appUrl}/donations - FDBRDG`;

    return {
      email: { subject: `Notice: Food Donation Cancelled (${foodTitle})`, html: emailHtml, text: emailText },
      sms: { message: smsMessage, senderId: this.DLT_SENDER_ID, dltTemplateId: 'DLT_CANCELLED_13' },
    };
  }
}
