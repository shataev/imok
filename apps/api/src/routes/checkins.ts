import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { findTodayCheckin, confirmCheckin, getCheckinHistory } from '../db/checkins.js';
import { reminderQueue } from '../queues/index.js';

const historyQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const checkinRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /checkins/today
  fastify.get('/today', async (request, reply) => {
    const userId = request.user.id;
    const checkin = await findTodayCheckin(userId);

    if (!checkin) {
      return reply.code(200).send({ status: 'pending', scheduledFor: null });
    }

    return reply.code(200).send({
      id: checkin.id,
      status: checkin.status,
      scheduledFor: checkin.scheduledFor,
      confirmedAt: checkin.confirmedAt,
    });
  });

  // GET /checkins?from=&to=
  fastify.get('/', async (request, reply) => {
    const userId = request.user.id;
    const query = historyQuerySchema.parse(request.query);
    const history = await getCheckinHistory(userId, query.from, query.to);
    return reply.code(200).send(history);
  });

  // POST /checkins/confirm
  fastify.post('/confirm', async (request, reply) => {
    const userId = request.user.id;

    const checkin = await findTodayCheckin(userId);
    if (!checkin) {
      return reply.code(404).send({ error: 'No checkin found for today' });
    }

    if (checkin.status !== 'pending') {
      return reply.code(200).send({
        id: checkin.id,
        status: checkin.status,
        scheduledFor: checkin.scheduledFor,
        confirmedAt: checkin.confirmedAt,
      });
    }

    const updated = await confirmCheckin(checkin.id);
    if (!updated) {
      return reply.code(409).send({ error: 'Checkin already processed' });
    }

    // Cancel the pending reminder job
    const reminderJob = await reminderQueue.getJob(`reminder:${checkin.id}`);
    if (reminderJob) {
      await reminderJob.remove();
      fastify.log.info({ checkinId: checkin.id }, 'Reminder job cancelled');
    }

    return reply.code(200).send({
      id: updated.id,
      status: updated.status,
      scheduledFor: updated.scheduledFor,
      confirmedAt: updated.confirmedAt,
    });
  });
};
