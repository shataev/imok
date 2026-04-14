import { sql } from './client.js';
import type { Checkin, CheckinStatus } from '@imok/shared';

function toCheckin(row: Record<string, unknown>): Checkin {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    scheduledFor: row.scheduled_for as string,
    confirmedAt: (row.confirmed_at as string) ?? null,
    escalatedAt: (row.escalated_at as string) ?? null,
    status: row.status as CheckinStatus,
    createdAt: row.created_at as string,
  };
}

export async function createCheckin(userId: string, scheduledFor: Date): Promise<Checkin> {
  const rows = await sql`
    INSERT INTO checkins (user_id, scheduled_for)
    VALUES (${userId}, ${scheduledFor})
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create checkin');
  return toCheckin(rows[0]);
}

export async function findCheckinByDate(userId: string, date: Date): Promise<Checkin | null> {
  const dateStr = date.toISOString().slice(0, 10);
  const rows = await sql`
    SELECT * FROM checkins
    WHERE user_id = ${userId}
      AND scheduled_for::DATE = ${dateStr}::DATE
    LIMIT 1
  `;
  return rows[0] ? toCheckin(rows[0]) : null;
}

export async function findTodayCheckin(userId: string): Promise<Checkin | null> {
  const rows = await sql`
    SELECT * FROM checkins
    WHERE user_id = ${userId}
      AND scheduled_for::DATE = CURRENT_DATE
    ORDER BY scheduled_for DESC
    LIMIT 1
  `;
  return rows[0] ? toCheckin(rows[0]) : null;
}

export async function confirmCheckin(checkinId: string): Promise<Checkin | null> {
  const rows = await sql`
    UPDATE checkins
    SET status = 'confirmed', confirmed_at = NOW()
    WHERE id = ${checkinId} AND status = 'pending'
    RETURNING *
  `;
  return rows[0] ? toCheckin(rows[0]) : null;
}

export async function escalateCheckin(checkinId: string): Promise<Checkin | null> {
  const rows = await sql`
    UPDATE checkins
    SET status = 'escalated', escalated_at = NOW()
    WHERE id = ${checkinId} AND status = 'pending'
    RETURNING *
  `;
  return rows[0] ? toCheckin(rows[0]) : null;
}

export async function skipCheckin(checkinId: string): Promise<void> {
  await sql`UPDATE checkins SET status = 'skipped' WHERE id = ${checkinId}`;
}

export async function getCheckinHistory(
  userId: string,
  from?: string,
  to?: string,
): Promise<Checkin[]> {
  const rows = await sql`
    SELECT * FROM checkins
    WHERE user_id = ${userId}
      ${from ? sql`AND scheduled_for >= ${from}::TIMESTAMPTZ` : sql``}
      ${to ? sql`AND scheduled_for <= ${to}::TIMESTAMPTZ` : sql``}
    ORDER BY scheduled_for DESC
    LIMIT 90
  `;
  return rows.map(toCheckin);
}
