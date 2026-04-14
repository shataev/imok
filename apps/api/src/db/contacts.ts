import { sql } from './client.js';
import type { Contact } from '@imok/shared';

function toContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    phone: row.phone as string,
    email: (row.email as string) ?? null,
    notifyViaPush: row.notify_via_push as boolean,
    notifyViaSms: row.notify_via_sms as boolean,
    notifyViaEmail: row.notify_via_email as boolean,
    createdAt: row.created_at as string,
  };
}

export async function listContacts(userId: string): Promise<Contact[]> {
  const rows = await sql`
    SELECT * FROM contacts WHERE user_id = ${userId} ORDER BY created_at ASC
  `;
  return rows.map(toContact);
}

export async function findContact(id: string, userId: string): Promise<Contact | null> {
  const rows = await sql`
    SELECT * FROM contacts WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `;
  return rows[0] ? toContact(rows[0]) : null;
}

export async function createContact(
  userId: string,
  fields: {
    name: string;
    phone: string;
    email?: string;
    notify_via_push: boolean;
    notify_via_sms: boolean;
    notify_via_email: boolean;
  },
): Promise<Contact> {
  const rows = await sql`
    INSERT INTO contacts ${sql({ user_id: userId, ...fields })}
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create contact');
  return toContact(rows[0]);
}

export async function updateContact(
  id: string,
  userId: string,
  fields: Partial<{
    name: string;
    phone: string;
    email: string | null;
    notify_via_push: boolean;
    notify_via_sms: boolean;
    notify_via_email: boolean;
  }>,
): Promise<Contact | null> {
  const rows = await sql`
    UPDATE contacts SET ${sql(fields)}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return rows[0] ? toContact(rows[0]) : null;
}

export async function deleteContact(id: string, userId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM contacts WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `;
  return rows.length > 0;
}

export async function markContactOptedOut(phone: string): Promise<void> {
  await sql`
    UPDATE contacts SET opted_out = TRUE, opted_out_at = NOW()
    WHERE phone = ${phone}
  `;
  await sql`
    INSERT INTO sms_opt_outs (phone) VALUES (${phone})
    ON CONFLICT (phone) DO NOTHING
  `;
}

export async function isPhoneOptedOut(phone: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM sms_opt_outs WHERE phone = ${phone} LIMIT 1
  `;
  return rows.length > 0;
}

export async function listActiveContactsForEscalation(userId: string): Promise<Contact[]> {
  const rows = await sql`
    SELECT * FROM contacts
    WHERE user_id = ${userId}
      AND opted_out = FALSE
    ORDER BY created_at ASC
  `;
  return rows.map(toContact);
}
