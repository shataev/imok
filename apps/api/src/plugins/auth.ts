import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fjwt from '@fastify/jwt';
import { config } from '../config.js';

export interface JwtPayload {
  id: string;
  phone: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fjwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: '1h' },
  });

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify<JwtPayload>();
      } catch {
        await reply.code(401).send({ error: 'Unauthorized' });
      }
    },
  );
};

export default fp(authPlugin);
