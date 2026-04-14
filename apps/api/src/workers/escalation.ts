import { Worker, type Job } from 'bullmq';
import { redis } from '../redis.js';
import { findCheckinByDate, escalateCheckin } from '../db/checkins.js';
import { listContacts } from '../db/contacts.js';
import { sendEscalationSms } from '../lib/sms.js';

interface EscalationJobData {
  checkinId: string;
  userId: string;
  userName: string;
}

async function processEscalation(job: Job<EscalationJobData>): Promise<void> {
  const { checkinId, userId, userName } = job.data;

  console.log(`[escalation] Processing for ${userName} (checkin ${checkinId})`);

  const checkin = await findCheckinByDate(userId, new Date());
  if (!checkin || checkin.id !== checkinId || checkin.status !== 'pending') {
    console.log(`[escalation] Checkin ${checkinId} not pending — skipping`);
    return;
  }

  await escalateCheckin(checkinId);

  const contacts = await listContacts(userId);
  if (contacts.length === 0) {
    console.log(`[escalation] ${userName} has no contacts to notify`);
    return;
  }

  for (const contact of contacts) {
    await sendEscalationSms(contact.phone, userName);
  }

  console.log(`[escalation] Escalated for ${userName}, notified ${contacts.length} contact(s)`);
}

export function startEscalationWorker(): Worker {
  const worker = new Worker<EscalationJobData>('escalation', processEscalation, {
    connection: redis,
    concurrency: 10,
  });

  worker.on('failed', (job, err) => {
    console.error(`[escalation] Job ${job?.id} failed:`, err);
  });

  return worker;
}
