import { listDeviceTokens } from '../db/devices.js';
import { getMessaging } from './firebase.js';

export async function sendCheckinPush(userId: string, userName: string): Promise<void> {
  const tokens = await listDeviceTokens(userId);

  if (tokens.length === 0) {
    console.log(`[PUSH] No devices for ${userName} — skipping`);
    return;
  }

  const messaging = getMessaging();

  if (!messaging) {
    console.log(`[PUSH] → ${userName} (${tokens.length} device(s)): "Are you OK today? Tap to confirm."`);
    return;
  }

  const { responses } = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: 'Are you OK?',
      body: 'Tap to confirm your daily check-in.',
    },
    data: { type: 'checkin' },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });

  const failed = responses.filter(r => !r.success);
  if (failed.length) {
    console.warn(`[PUSH] ${failed.length}/${tokens.length} deliveries failed for ${userName}`);
  } else {
    console.log(`[PUSH] Delivered to ${userName} (${tokens.length} device(s))`);
  }
}

export async function sendReminderPush(userId: string, userName: string): Promise<void> {
  const tokens = await listDeviceTokens(userId);

  if (tokens.length === 0) return;

  const messaging = getMessaging();

  if (!messaging) {
    console.log(`[PUSH] Reminder → ${userName}: "We haven't heard from you yet. Are you OK?"`);
    return;
  }

  await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: 'Reminder',
      body: "We haven't heard from you yet. Are you OK?",
    },
    data: { type: 'reminder' },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });

  console.log(`[PUSH] Reminder delivered to ${userName}`);
}
