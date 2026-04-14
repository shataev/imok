import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { upsertDevice, removeDevice } from '../db/devices.js';

const registerDeviceSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

const deviceTokenSchema = z.object({ token: z.string().min(1) });

export const deviceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /devices
  fastify.post('/', async (request, reply) => {
    const { fcmToken, platform } = registerDeviceSchema.parse(request.body);
    await upsertDevice(request.user.id, fcmToken, platform);
    fastify.log.info({ userId: request.user.id, platform }, 'Device registered');
    return reply.code(200).send({ registered: true });
  });

  // DELETE /devices/:token
  fastify.delete('/:token', async (request, reply) => {
    const { token } = deviceTokenSchema.parse(request.params);
    await removeDevice(request.user.id, token);
    return reply.code(204).send();
  });
};
