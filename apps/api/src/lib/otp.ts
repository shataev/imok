import bcrypt from 'bcrypt';
import { sql } from '../db/client.js';

const OTP_TTL_MINUTES = 5;
const BCRYPT_ROUNDS = 10;

export function generateOtpCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

export async function createOtp(phone: string): Promise<string> {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await sql`
    INSERT INTO otp_requests (phone, code_hash, expires_at)
    VALUES (${phone}, ${codeHash}, ${expiresAt})
  `;

  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const rows = await sql`
    SELECT id, code_hash FROM otp_requests
    WHERE phone = ${phone}
      AND used_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!rows[0]) return false;

  const isValid = await bcrypt.compare(code, rows[0].code_hash as string);
  if (!isValid) return false;

  await sql`
    UPDATE otp_requests SET used_at = NOW() WHERE id = ${rows[0].id as string}
  `;

  return true;
}
