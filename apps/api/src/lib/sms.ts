import twilio from 'twilio';
import { config } from '../config.js';

const isReal =
  config.TWILIO_ACCOUNT_SID !== 'ACplaceholder' &&
  config.TWILIO_AUTH_TOKEN !== 'placeholder';

const client = isReal ? twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN) : null;

// ── Twilio Verify ────────────────────────────────────────────────────────────

export async function sendVerifyOtp(phone: string): Promise<void> {
  if (!client) {
    console.log(`[Verify] OTP requested for ${phone} (Twilio not configured)`);
    return;
  }
  await client.verify.v2
    .services(config.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to: phone, channel: 'sms' });
}

export async function checkVerifyOtp(phone: string, code: string): Promise<boolean> {
  if (!client) {
    // Dev fallback: accept code "123456"
    return code === '123456';
  }
  const result = await client.verify.v2
    .services(config.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: phone, code });
  return result.status === 'approved';
}

async function send(to: string, body: string): Promise<void> {
  if (!client) {
    console.log(`[SMS] → ${to}: "${body}"`);
    return;
  }
  await client.messages.create({ body, from: config.TWILIO_FROM_NUMBER, to });
}

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  await send(
    phone,
    `Your imok verification code is: ${code}\n\nValid for 5 minutes. Do not share this code.`,
  );
}

export async function sendContactInviteSms(
  contactPhone: string,
  userName: string,
): Promise<void> {
  await send(
    contactPhone,
    `${userName} added you as an emergency contact in imok. ` +
      `If they don't check in, you'll receive an SMS. Reply STOP to opt out.`,
  );
}

export async function sendEscalationSms(
  contactPhone: string,
  userName: string,
): Promise<void> {
  await send(
    contactPhone,
    `We haven't heard from ${userName} today. ` +
      `They may need your help — please check in on them.\n\nReply STOP to opt out.`,
  );
}
