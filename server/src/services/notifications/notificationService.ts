import { IUser } from '../../models/User';
import { IOrganization } from '../../models/Organization';
import { IDonation } from '../../models/Donation';
import { IDonationRequest } from '../../models/DonationRequest';
import { NotificationType, DeliveryState, INotification } from '../../models/Notification';
import { NotificationQueue, IDeliveryLog, QueueJobParams, DispatchResult } from './notificationQueue';
import { NotificationEventHandlers } from './eventHandlers';
import { ExpiryScheduler, ExpiryCheckSummary } from './expiryScheduler';

export class NotificationService {
  public static get isSandbox(): boolean {
    return process.env.NOTIFICATION_SANDBOX !== 'false';
  }

  /**
   * Core dispatcher directly delegating to reliable NotificationQueue
   */
  public static async dispatchNotification(params: QueueJobParams): Promise<DispatchResult> {
    return await NotificationQueue.enqueue(params);
  }

  // =========================================================================
  // WORKFLOW 1 & PHASE 2: User Registration & Account Status Notifications
  // =========================================================================
  public static async sendRegistrationConfirmation(params: {
    user: IUser;
    organization: IOrganization;
    sendSms?: boolean;
    simulateGatewayFailure?: boolean;
    forceRetry?: boolean;
  }) {
    return await NotificationEventHandlers.onUserRegistered(params);
  }

  public static async sendAccountStatusUpdate(params: {
    organization: IOrganization;
    action: 'approve' | 'reject';
    notes?: string;
  }) {
    return await NotificationEventHandlers.onAccountStatusChanged(params);
  }

  // =========================================================================
  // WORKFLOW 2 & PHASE 3: Food Listing Alerts (Targeted to Verified NGOs)
  // =========================================================================
  public static async sendFoodListingAlerts(params: {
    donation: IDonation;
    providerUser: IUser;
    eligibleNgos?: Array<{ ngoId: string; ngoName: string; matchScore: number; distanceKm: number | null; phone?: string; email?: string }>;
    simulateGatewayFailure?: boolean;
  }) {
    return await NotificationEventHandlers.onDonationCreated(params);
  }

  // =========================================================================
  // WORKFLOW 3 & PHASE 4: NGO Collection Request, Approval & Rejection
  // =========================================================================
  public static async sendDonationRequestAlert(params: {
    donation: IDonation;
    request: IDonationRequest;
    providerUser: IUser;
    ngoOrg: IOrganization;
    ngoUser: IUser;
  }) {
    return await NotificationEventHandlers.onDonationRequested(params);
  }

  public static async sendRequestApprovalAlert(params: {
    donation: IDonation;
    request: IDonationRequest;
    providerUser: IUser;
    ngoOrg: IOrganization;
    ngoUser: IUser;
  }) {
    return await NotificationEventHandlers.onDonationRequestApproved(params);
  }

  public static async sendRequestRejectionAlert(params: {
    donation: IDonation;
    request: IDonationRequest;
    ngoUser: IUser;
  }) {
    return await NotificationEventHandlers.onDonationRequestRejected(params);
  }

  // =========================================================================
  // WORKFLOW 4 & PHASE 5: Driver Assignment, Pickup & Delivery Confirmation
  // =========================================================================
  public static async sendDriverAssignmentAlert(params: {
    donation: IDonation;
    driverName: string;
    driverPhone: string;
    pickupWindow: string;
    providerUser?: IUser | null;
    ngoUser?: IUser | null;
  }) {
    return await NotificationEventHandlers.onDriverAssigned(params);
  }

  public static async sendPickupConfirmation(params: {
    donation: IDonation;
    providerUser?: IUser | null;
    ngoUser?: IUser | null;
  }) {
    return await NotificationEventHandlers.onPickupConfirmed(params);
  }

  public static async sendDeliveryConfirmation(params: {
    donation: IDonation;
    providerUser?: IUser | null;
    ngoUser?: IUser | null;
    recipientOrgName?: string;
  }) {
    return await NotificationEventHandlers.onDeliveryConfirmed(params);
  }

  // =========================================================================
  // PHASE 6: Expiry & Urgent Safety Monitoring
  // =========================================================================
  public static async runExpiryMonitoring(): Promise<ExpiryCheckSummary> {
    return await ExpiryScheduler.runExpiryCheck();
  }

  public static startExpiryScheduler(intervalMs?: number): void {
    ExpiryScheduler.start(intervalMs);
  }

  public static stopExpiryScheduler(): void {
    ExpiryScheduler.stop();
  }

  // =========================================================================
  // AUDIT LOGS & DELIVERY INSPECTION
  // =========================================================================
  public static getDeliveryLogs(filter?: {
    channel?: 'in_app' | 'email' | 'sms';
    recipient?: string;
    status?: DeliveryState;
  }): IDeliveryLog[] {
    return NotificationQueue.getDeliveryLogs(filter);
  }

  public static clearDeliveryLogs(): void {
    NotificationQueue.clearDeliveryLogs();
  }
}
