import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';

import authPlugin from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/user.js';
import { contactRoutes } from './routes/contacts.js';
import { checkinRoutes } from './routes/checkins.js';
import { pauseRoutes } from './routes/pauses.js';
import { deviceRoutes } from './routes/devices.js';
import { twilioRoutes } from './routes/twilio.js';
import { config } from './config.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(config.NODE_ENV !== 'production' && {
        transport: { target: 'pino-pretty' },
      }),
    },
  });

  // Security
  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: config.NODE_ENV === 'production' ? 'https://imok.app' : true,
  });
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Auth plugin (decorates fastify.authenticate)
  await fastify.register(authPlugin);

  // Routes
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(userRoutes, { prefix: '/user' });
  await fastify.register(contactRoutes, { prefix: '/contacts' });
  await fastify.register(checkinRoutes, { prefix: '/checkins' });
  await fastify.register(pauseRoutes, { prefix: '/pauses' });
  await fastify.register(deviceRoutes, { prefix: '/devices' });
  await fastify.register(twilioRoutes, { prefix: '/twilio' });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok' }));

  // Zod validation errors → 400
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.flatten().fieldErrors,
      });
    }
    fastify.log.error(error);
    const err = error as { statusCode?: number; message?: string };
    return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Internal Server Error' });
  });

  return fastify;
}
