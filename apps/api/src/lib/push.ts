import { listDeviceTokens } from '../db/devices.js';

// TODO (Week 6): replace with real Firebase Admin SDK calls
// For now, logs to console so local dev flow is testable

export async function sendCheckinPush(userId: string, userName: string): Promise<void> {
  const tokens = await listDeviceTokens(userId);

  if (tokens.length === 0) {
    console.log(`[PUSH] No devices for user ${userId} (${userName}) — skipping`);
    return;
  }

  console.log(
    `[PUSH] → ${userName} (${tokens.length} device(s)): "Are you OK today? Tap to confirm."`,
  );
  // await firebaseAdmin.messaging().sendEachForMulticast({ tokens, notification: { ... } })
}

export async function sendReminderPush(userId: string, userName: string): Promise<void> {
  const tokens = await listDeviceTokens(userId);

  if (tokens.length === 0) return;

  console.log(`[PUSH] Reminder → ${userName}: "We haven't heard from you yet. Are you OK?"`);
}
