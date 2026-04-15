import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendVerifyOtp, checkVerifyOtp } from '../lib/sms.js';
import { issueTokens, rotateRefreshToken } from '../lib/tokens.js';
import { findUserByPhone, createUser } from '../db/users.js';

const requestOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{7,15}$/, 'Phone must be in E.164 format, e.g. +66812345678'),
});

const verifyOtpSchema = z.object({
  phone: z.string(),
  otp: z.string().length(6),
});

const refreshSchema = z.object({
  refreshToken: z.string().uuid(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/request-otp
  fastify.post('/request-otp', async (request, reply) => {
    const { phone } = requestOtpSchema.parse(request.body);

    await sendVerifyOtp(phone);

    fastify.log.info({ phone }, 'OTP sent');
    return reply.code(200).send({ message: 'OTP sent' });
  });

  // POST /auth/verify-otp
  fastify.post('/verify-otp', async (request, reply) => {
    const { phone, otp } = verifyOtpSchema.parse(request.body);

    const isValid = await checkVerifyOtp(phone, otp);
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid or expired code' });
    }

    // Find or create user
    let user = await findUserByPhone(phone);
    const isNewUser = !user;
    if (!user) {
      user = await createUser(phone);
    }

    const tokens = await issueTokens(fastify, { id: user.id, phone: user.phone });

    fastify.log.info({ userId: user.id, isNewUser }, 'User authenticated');
    return reply.code(200).send({ ...tokens, isNewUser });
  });

  // POST /auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);

    const tokens = await rotateRefreshToken(fastify, refreshToken);
    if (!tokens) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }

    return reply.code(200).send(tokens);
  });
};
