import twilio from 'twilio';
import { config } from '../config.js';

const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  // await client.messages.create({
  //   body: `Your imok verification code is: ${code}\n\nValid for 5 minutes. Do not share this code.`,
  //   from: config.TWILIO_FROM_NUMBER,
  //   to: phone,
  // });
  console.log(`OTP for ${phone}: ${code}`);
}

export async function sendContactInviteSms(
  contactPhone: string,
  userName: string,
): Promise<void> {
  // await client.messages.create({
  //   body:
  //     `${userName} added you as an emergency contact in imok. ` +
  //     `If they don't check in, you'll receive an SMS. ` +
  //     `Reply STOP to opt out.`,
  //   from: config.TWILIO_FROM_NUMBER,
  //   to: contactPhone,
  // });
  console.log(`[SMS] Contact invite to ${contactPhone} from user "${userName}"`);
}

export async function sendEscalationSms(
  contactPhone: string,
  userName: string,
): Promise<void> {
  await client.messages.create({
    body:
      `We haven't heard from ${userName} today. ` +
      `They may need your help — please check in on them.\n\n` +
      `Reply STOP to opt out of these alerts.`,
    from: config.TWILIO_FROM_NUMBER,
    to: contactPhone,
  });
}
