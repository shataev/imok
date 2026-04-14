import { sql } from './client.js';

export async function upsertDevice(
  userId: string,
  fcmToken: string,
  platform: 'ios' | 'android',
): Promise<void> {
  await sql`
    INSERT INTO devices (user_id, fcm_token, platform)
    VALUES (${userId}, ${fcmToken}, ${platform})
    ON CONFLICT (fcm_token) DO UPDATE
      SET user_id = ${userId}, platform = ${platform}, updated_at = NOW()
  `;
}

export async function removeDevice(userId: string, fcmToken: string): Promise<void> {
  await sql`
    DELETE FROM devices WHERE fcm_token = ${fcmToken} AND user_id = ${userId}
  `;
}

export async function listDeviceTokens(userId: string): Promise<string[]> {
  const rows = await sql`
    SELECT fcm_token FROM devices WHERE user_id = ${userId}
  `;
  return rows.map((r) => r.fcm_token as string);
}
