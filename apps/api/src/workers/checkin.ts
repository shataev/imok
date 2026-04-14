import { Worker, type Job } from 'bullmq';
import { redis } from '../redis.js';
import { createCheckin, findCheckinByDate } from '../db/checkins.js';
import { isUserOnPause } from '../db/pauses.js';
import { skipCheckin } from '../db/checkins.js';
import { sendCheckinPush } from '../lib/push.js';
import { reminderQueue } from '../queues/index.js';

export interface CheckinJobData {
  userId: string;
  userName: string;
  gracePeriodMin: number;
  scheduledFor: string;
}

async function processCheckin(job: Job<CheckinJobData>): Promise<void> {
  const { userId, userName, gracePeriodMin, scheduledFor } = job.data;
  const scheduledDate = new Date(scheduledFor);

  console.log(`[checkin] Processing for ${userName} (${userId})`);

  // Check if already processed today (deduplication guard)
  const existing = await findCheckinByDate(userId, scheduledDate);
  if (existing) {
    console.log(`[checkin] Already exists for ${userName} today — skipping`);
    return;
  }

  // Check if user has an active pause for today
  const onPause = await isUserOnPause(userId, scheduledDate);
  if (onPause) {
    const checkin = await createCheckin(userId, scheduledDate);
    await skipCheckin(checkin.id);
    console.log(`[checkin] ${userName} is on pause today — skipped`);
    return;
  }

  // Create checkin record
  const checkin = await createCheckin(userId, scheduledDate);
  console.log(`[checkin] Created checkin ${checkin.id} for ${userName}`);

  // Send push notification
  await sendCheckinPush(userId, userName);

  // Schedule reminder after grace period
  const reminderDelayMs = gracePeriodMin * 60 * 1000;
  await reminderQueue.add(
    'send-reminder',
    { checkinId: checkin.id, userId, userName },
    {
      jobId: `reminder:${checkin.id}`,
      delay: reminderDelayMs,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  console.log(`[checkin] Reminder scheduled for ${userName} in ${gracePeriodMin} min`);
}

export function startCheckinWorker(): Worker {
  const worker = new Worker<CheckinJobData>('checkin', processCheckin, {
    connection: redis,
    concurrency: 10,
  });

  worker.on('failed', (job, err) => {
    console.error(`[checkin] Job ${job?.id} failed:`, err);
  });

  return worker;
}
