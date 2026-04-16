import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { findUserById, updateUser, deleteUser } from '../db/users.js';
import { checkinQueue } from '../queues/index.js';
import { localTimeToUtcToday } from '../lib/schedule.js';

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).optional(),
  checkinTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format')
    .optional(),
  gracePeriodMin: z.number().int().min(30).max(480).optional(),
});

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /user/me
  fastify.get('/me', async (request, reply) => {
    const user = await findUserById(request.user.id);
    if (!user) return reply.code(404).send({ error: 'User not found' });
    return reply.code(200).send(user);
  });

  // PATCH /user/me
  fastify.patch('/me', async (request, reply) => {
    const payload = updateUserSchema.parse(request.body);

    const dbFields: Parameters<typeof updateUser>[1] = {};
    if (payload.name !== undefined) dbFields.name = payload.name;
    if (payload.timezone !== undefined) dbFields.timezone = payload.timezone;
    if (payload.checkinTime !== undefined) dbFields.checkin_time = payload.checkinTime;
    if (payload.gracePeriodMin !== undefined) dbFields.grace_period_min = payload.gracePeriodMin;

    const user = await updateUser(request.user.id, dbFields);

    // Schedule today's checkin if not already queued (handles new users who registered after midnight)
    const checkinUtc = localTimeToUtcToday(user.checkinTime, user.timezone);
    const delayMs = checkinUtc.getTime() - Date.now();
    if (delayMs > -60 * 60 * 1000) {
      const jobId = `checkin:${user.id}:${checkinUtc.toISOString().slice(0, 10)}`;
      await checkinQueue.add(
        'send-checkin',
        {
          userId: user.id,
          userName: user.name ?? '',
          gracePeriodMin: user.gracePeriodMin,
          scheduledFor: checkinUtc.toISOString(),
        },
        { jobId, delay: Math.max(0, delayMs), removeOnComplete: true, removeOnFail: false },
      );
    }

    return reply.code(200).send(user);
  });

  // DELETE /user/me
  fastify.delete('/me', async (request, reply) => {
    await deleteUser(request.user.id);
    return reply.code(204).send();
  });
};
