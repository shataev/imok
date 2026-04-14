import { randomUUID } from 'crypto';
import { redis } from '../redis.js';
import { config } from '../config.js';
import type { JwtPayload } from '../plugins/auth.js';

const REFRESH_TOKEN_TTL_DAYS = 30;
const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

function redisRefreshKey(token: string): string {
  return `refresh:${token}`;
}

export async function issueTokens(
  fastify: { jwt: { sign: (payload: JwtPayload) => string } },
  payload: JwtPayload,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = fastify.jwt.sign(payload);

  const refreshToken = randomUUID();
  await redis.set(
    redisRefreshKey(refreshToken),
    JSON.stringify(payload),
    'EX',
    REFRESH_TOKEN_TTL_SECONDS,
  );

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(
  fastify: { jwt: { sign: (payload: JwtPayload) => string } },
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const key = redisRefreshKey(refreshToken);
  const raw = await redis.get(key);
  if (!raw) return null;

  // Delete old token (rotation — one-time use)
  await redis.del(key);

  const payload = JSON.parse(raw) as JwtPayload;
  return issueTokens(fastify, payload);
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await redis.del(redisRefreshKey(refreshToken));
}
