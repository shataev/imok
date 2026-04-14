import { sql } from './client.js';
import type { Pause } from '@imok/shared';

function toPause(row: Record<string, unknown>): Pause {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    pauseFrom: row.pause_from as string,
    pauseUntil: row.pause_until as string,
    reason: (row.reason as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function isUserOnPause(userId: string, date: Date): Promise<boolean> {
  const dateStr = date.toISOString().slice(0, 10);
  const rows = await sql`
    SELECT 1 FROM pauses
    WHERE user_id = ${userId}
      AND pause_from <= ${dateStr}::DATE
      AND pause_until >= ${dateStr}::DATE
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function listPauses(userId: string): Promise<Pause[]> {
  const rows = await sql`
    SELECT * FROM pauses
    WHERE user_id = ${userId}
    ORDER BY pause_from DESC
  `;
  return rows.map(toPause);
}

export async function createPause(
  userId: string,
  pauseFrom: string,
  pauseUntil: string,
  reason?: string,
): Promise<Pause> {
  const rows = await sql`
    INSERT INTO pauses (user_id, pause_from, pause_until, reason)
    VALUES (${userId}, ${pauseFrom}::DATE, ${pauseUntil}::DATE, ${reason ?? null})
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create pause');
  return toPause(rows[0]);
}

export async function deletePause(id: string, userId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM pauses WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `;
  return rows.length > 0;
}
