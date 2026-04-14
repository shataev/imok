import { buildApp } from './app.js';
import { config } from './config.js';
import { startSchedulerWorker } from './workers/scheduler.js';
import { startCheckinWorker } from './workers/checkin.js';
import { startReminderWorker } from './workers/reminder.js';
import { startEscalationWorker } from './workers/escalation.js';
import { schedulerQueue } from './queues/index.js';

const app = await buildApp();

// Start background workers
startCheckinWorker();
startReminderWorker();
startEscalationWorker();
startSchedulerWorker();

// Enqueue the daily scheduler job with a repeating cron (midnight UTC every day)
await schedulerQueue.upsertJobScheduler(
  'daily-scheduler',
  { pattern: '0 0 * * *' }, // midnight UTC
  {
    name: 'run-scheduler',
    data: { triggeredAt: new Date().toISOString() },
  },
);

// Also run immediately on startup so dev/staging picks up today's checkins
await schedulerQueue.add('run-scheduler', { triggeredAt: new Date().toISOString() }, {
  removeOnComplete: true,
  removeOnFail: true,
});

app.log.info('Workers started, scheduler registered');

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
