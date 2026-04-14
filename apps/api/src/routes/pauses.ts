import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const createPauseSchema = z
  .object({
    pauseFrom: z.string().date(),
    pauseUntil: z.string().date(),
    reason: z.string().max(500).optional(),
  })
  .refine((data) => data.pauseFrom <= data.pauseUntil, {
    message: 'pauseFrom must be before or equal to pauseUntil',
  });

const pauseIdSchema = z.object({ id: z.string().uuid() });

export const pauseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /pauses
  fastify.get('/', async (request, reply) => {
    const userId = request.user.id;

    // TODO (Week 7): fetch active and future pauses
    fastify.log.info({ userId }, 'List pauses');

    return reply.code(200).send([]);
  });

  // POST /pauses
  fastify.post('/', async (request, reply) => {
    const userId = request.user.id;
    const payload = createPauseSchema.parse(request.body);

    // TODO (Week 7): insert pause, cancel scheduled checkin jobs in range
    fastify.log.info({ userId, payload }, 'Create pause');

    return reply.code(201).send({ id: 'todo', userId, ...payload });
  });

  // DELETE /pauses/:id
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.user.id;
    const { id } = pauseIdSchema.parse(request.params);

    // TODO (Week 7): delete pause, verify ownership, re-schedule jobs if needed
    fastify.log.info({ userId, id }, 'Cancel pause');

    return reply.code(204).send();
  });
};
