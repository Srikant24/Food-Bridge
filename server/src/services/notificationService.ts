/**
 * Re-export modular notification architecture for seamless backward compatibility
 */
export { NotificationService } from './notifications/notificationService';
export {
  NotificationQueue,
  IDeliveryLog,
  QueueJobParams,
  DispatchResult,
  isValidEmail,
  isValidPhoneNumber,
} from './notifications/notificationQueue';
export { TemplateRenderer } from './notifications/templateRenderer';
export { NotificationEventHandlers } from './notifications/eventHandlers';
export { ExpiryScheduler } from './notifications/expiryScheduler';
export { createEmailProvider } from './notifications/emailProvider';
export { createSmsProvider } from './notifications/smsProvider';
