import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  listContacts,
  findContact,
  createContact,
  updateContact,
  deleteContact,
} from '../db/contacts.js';
import { findUserById } from '../db/users.js';
import { sendContactInviteSms } from '../lib/sms.js';

const createContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+\d{7,15}$/, 'Phone must be in E.164 format'),
  email: z.string().email().optional(),
  notifyViaPush: z.boolean().default(false),
  notifyViaSms: z.boolean().default(true),
  notifyViaEmail: z.boolean().default(false),
});

const updateContactSchema = createContactSchema
  .omit({ phone: true })
  .partial()
  .extend({
    email: z.string().email().nullable().optional(),
  });

const contactIdSchema = z.object({ id: z.string().uuid() });

export const contactRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /contacts
  fastify.get('/', async (request, reply) => {
    const contacts = await listContacts(request.user.id);
    return reply.code(200).send(contacts);
  });

  // POST /contacts
  fastify.post('/', async (request, reply) => {
    const userId = request.user.id;
    const payload = createContactSchema.parse(request.body);

    const contact = await createContact(userId, {
      name: payload.name,
      phone: payload.phone,
      email: payload.email ?? null,
      notify_via_push: payload.notifyViaPush,
      notify_via_sms: payload.notifyViaSms,
      notify_via_email: payload.notifyViaEmail,
    });

    // Send informational SMS to contact (non-blocking)
    const user = await findUserById(userId);
    if (user) {
      sendContactInviteSms(payload.phone, user.name || 'Someone').catch((err: unknown) => {
        fastify.log.warn({ err, phone: payload.phone }, 'Failed to send contact invite SMS');
      });
    }

    return reply.code(201).send(contact);
  });

  // PATCH /contacts/:id
  fastify.patch('/:id', async (request, reply) => {
    const { id } = contactIdSchema.parse(request.params);
    const payload = updateContactSchema.parse(request.body);

    const fields: Parameters<typeof updateContact>[2] = {};
    if (payload.name !== undefined) fields.name = payload.name;
    if (payload.email !== undefined) fields.email = payload.email;
    if (payload.notifyViaPush !== undefined) fields.notify_via_push = payload.notifyViaPush;
    if (payload.notifyViaSms !== undefined) fields.notify_via_sms = payload.notifyViaSms;
    if (payload.notifyViaEmail !== undefined) fields.notify_via_email = payload.notifyViaEmail;

    const contact = await updateContact(id, request.user.id, fields);
    if (!contact) return reply.code(404).send({ error: 'Contact not found' });

    return reply.code(200).send(contact);
  });

  // DELETE /contacts/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = contactIdSchema.parse(request.params);
    const deleted = await deleteContact(id, request.user.id);
    if (!deleted) return reply.code(404).send({ error: 'Contact not found' });
    return reply.code(204).send();
  });
};
