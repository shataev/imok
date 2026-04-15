import type { FastifyPluginAsync } from 'fastify';
import { markContactOptedOut } from '../db/contacts.js';

// Twilio sends form-encoded POST when someone replies STOP/UNSUBSCRIBE/CANCEL/QUIT/HELP
export const twilioRoutes: FastifyPluginAsync = async (fastify) => {
  // Parse application/x-www-form-urlencoded (Twilio's format)
  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_req, body, done) => {
      const parsed = Object.fromEntries(new URLSearchParams(body as string));
      done(null, parsed);
    },
  );

  // POST /twilio/sms — inbound SMS webhook
  fastify.post('/sms', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const from: string = body.From ?? '';
    const text: string = (body.Body ?? '').trim().toUpperCase();

    const stopWords = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'END'];

    if (stopWords.includes(text)) {
      await markContactOptedOut(from);
      fastify.log.info({ phone: from }, 'SMS opt-out recorded');
      // Twilio expects TwiML response — empty = no reply sent
      return reply
        .code(200)
        .header('Content-Type', 'text/xml')
        .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    fastify.log.info({ from, text }, 'Inbound SMS (not a stop word)');
    return reply
      .code(200)
      .header('Content-Type', 'text/xml')
      .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  });
};
