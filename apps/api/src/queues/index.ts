import { Queue } from 'bullmq';
import { redis } from '../redis.js';

// Runs once per day at midnight UTC — schedules checkin jobs for all users
export const schedulerQueue = new Queue('scheduler', { connection: redis });

// One job per user per day — creates checkin record + sends push
export const checkinQueue = new Queue('checkin', { connection: redis });

// Delayed job — fires after grace_period_min if checkin not confirmed
export const reminderQueue = new Queue('reminder', { connection: redis });

// Delayed job — fires after grace_period_min + 30min, triggers escalation
export const escalationQueue = new Queue('escalation', { connection: redis });
