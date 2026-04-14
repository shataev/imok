import { sql } from './client.js';
import type { User } from '@imok/shared';

function toUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    phone: row.phone as string,
    name: row.name as string,
    timezone: row.timezone as string,
    checkinTime: row.checkin_time as string,
    gracePeriodMin: row.grace_period_min as number,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  };
}

export async function findUserByPhone(phone: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE phone = ${phone} LIMIT 1`;
  return rows[0] ? toUser(rows[0]) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] ? toUser(rows[0]) : null;
}

export async function createUser(phone: string): Promise<User> {
  const rows = await sql`
    INSERT INTO users (phone, name) VALUES (${phone}, '')
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create user');
  return toUser(rows[0]);
}

export async function updateUser(
  id: string,
  fields: Partial<{
    name: string;
    timezone: string;
    checkin_time: string;
    grace_period_min: number;
  }>,
): Promise<User> {
  const rows = await sql`
    UPDATE users SET ${sql(fields)} WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to update user');
  return toUser(rows[0]);
}

export async function deleteUser(id: string): Promise<void> {
  await sql`DELETE FROM users WHERE id = ${id}`;
}
