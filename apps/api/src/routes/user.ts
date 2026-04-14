import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { findUserById, updateUser, deleteUser } from '../db/users.js';

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
    return reply.code(200).send(user);
  });

  // DELETE /user/me
  fastify.delete('/me', async (request, reply) => {
    await deleteUser(request.user.id);
    return reply.code(204).send();
  });
};
