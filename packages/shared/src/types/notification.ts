export type NotificationChannel = 'push' | 'sms' | 'email';
export type NotificationRecipientType = 'user' | 'contact';
export type NotificationStatus = 'sent' | 'delivered' | 'failed';

export interface NotificationLog {
  id: string;
  checkinId: string | null;
  recipientType: NotificationRecipientType;
  recipientId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt: string;
}
