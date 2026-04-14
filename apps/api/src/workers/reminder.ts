import { Worker, type Job } from 'bullmq';
import { redis } from '../redis.js';
import { findCheckinByDate, escalateCheckin } from '../db/checkins.js';
import { sendReminderPush } from '../lib/push.js';
import { escalationQueue } from '../queues/index.js';

interface ReminderJobData {
  checkinId: string;
  userId: string;
  userName: string;
}

async function processReminder(job: Job<ReminderJobData>): Promise<void> {
  const { checkinId, userId, userName } = job.data;

  console.log(`[reminder] Processing for ${userName} (checkin ${checkinId})`);

  // Re-fetch checkin — may have been confirmed while delayed
  const checkin = await findCheckinByDate(userId, new Date());
  if (!checkin || checkin.id !== checkinId) {
    console.log(`[reminder] Checkin ${checkinId} not found — skipping`);
    return;
  }

  if (checkin.status !== 'pending') {
    console.log(`[reminder] Checkin ${checkinId} already ${checkin.status} — skipping`);
    return;
  }

  // Send reminder push
  await sendReminderPush(userId, userName);

  // Schedule escalation in 30 min
  await escalationQueue.add(
    'send-escalation',
    { checkinId, userId, userName },
    {
      jobId: `escalation:${checkinId}`,
      delay: 30 * 60 * 1000,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  console.log(`[reminder] Sent reminder to ${userName}, escalation in 30min`);
}

export function startReminderWorker(): Worker {
  const worker = new Worker<ReminderJobData>('reminder', processReminder, {
    connection: redis,
    concurrency: 10,
  });

  worker.on('failed', (job, err) => {
    console.error(`[reminder] Job ${job?.id} failed:`, err);
  });

  return worker;
}
