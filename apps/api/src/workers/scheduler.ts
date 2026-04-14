import { Worker, type Job } from 'bullmq';
import { redis } from '../redis.js';
import { sql } from '../db/client.js';
import { checkinQueue } from '../queues/index.js';
import type { User } from '@imok/shared';

interface SchedulerJobData {
  triggeredAt: string;
}

// Convert "HH:MM" local time in a given timezone to a UTC Date for today
function localTimeToUtcToday(timeStr: string, timezone: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();

  // Build a date string in the target timezone for today
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const localDateStr = formatter.format(now); // "YYYY-MM-DD"

  // Construct ISO string in local time, then let Date parse it as UTC offset
  const localIso = `${localDateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  // Use Intl to get the UTC offset at that moment in the timezone
  const localDate = new Date(
    new Date(localIso + 'Z').toLocaleString('en-US', { timeZone: 'UTC' }),
  );

  // Get the offset: difference between local time and UTC
  const utcDate = new Date(
    new Date(localIso + 'Z').toLocaleString('en-US', { timeZone: timezone }),
  );
  const offsetMs = localDate.getTime() - utcDate.getTime();

  return new Date(new Date(localIso + 'Z').getTime() + offsetMs);
}

async function scheduleCheckins(_job: Job<SchedulerJobData>): Promise<void> {
  console.log('[scheduler] Running daily checkin scheduler...');

  const rows = await sql`
    SELECT id, name, timezone,
           checkin_time      AS "checkinTime",
           grace_period_min  AS "gracePeriodMin"
    FROM users
    WHERE is_active = TRUE
  `;

  const users = rows as Pick<User, 'id' | 'name' | 'timezone' | 'checkinTime' | 'gracePeriodMin'>[];

  const now = new Date();
  let scheduled = 0;

  for (const user of users) {
    const checkinUtc = localTimeToUtcToday(user.checkinTime, user.timezone);
    const delayMs = checkinUtc.getTime() - now.getTime();

    // Skip if time already passed for today (more than 1 hour ago)
    if (delayMs < -60 * 60 * 1000) {
      console.log(`[scheduler] Skipping ${user.name} — checkin time already passed today`);
      continue;
    }

    const jobId = `checkin:${user.id}:${checkinUtc.toISOString().slice(0, 10)}`;

    await checkinQueue.add(
      'send-checkin',
      {
        userId: user.id,
        userName: user.name,
        gracePeriodMin: user.gracePeriodMin,
        scheduledFor: checkinUtc.toISOString(),
      },
      {
        jobId, // deduplicate — same user can only have one job per day
        delay: Math.max(0, delayMs),
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    scheduled++;
    console.log(
      `[scheduler] Scheduled checkin for ${user.name} at ${checkinUtc.toISOString()} (delay: ${Math.round(delayMs / 1000 / 60)}min)`,
    );
  }

  console.log(`[scheduler] Done — scheduled ${scheduled} checkin(s)`);
}

export function startSchedulerWorker(): Worker {
  const worker = new Worker<SchedulerJobData>('scheduler', scheduleCheckins, {
    connection: redis,
    concurrency: 1,
  });

  worker.on('failed', (job, err) => {
    console.error(`[scheduler] Job ${job?.id} failed:`, err);
  });

  return worker;
}
