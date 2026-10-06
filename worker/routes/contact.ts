import type { Env } from '../lib/env';
import { failure, readFields, success } from '../lib/http';
import { guard, isDuplicate } from '../lib/guard';
import { Validator, sourcePage } from '../lib/validate';
import { forwardToCrm, notifyTeam } from '../lib/integrations';

const REDIRECT = '/thank-you/contact';

/** General business inquiries only. Service requests belong on /start. */
export async function handleContact(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const fields = await readFields(request);
  const blocked = await guard(env, request, fields, 'contact', REDIRECT);
  if (blocked) return blocked;

  const v = new Validator(fields);
  const id = v.submissionId();
  const name = v.text('name', 'Name', { required: true, max: 120 });
  const email = v.email('email');
  const organization = v.text('organization', 'Organization', { max: 120 });
  const subject = v.text('subject', 'Subject', { max: 150 });
  const message = v.text('message', 'Message', { required: true, max: 1000 });
  if (!v.ok) return failure(request, 422, 'Please correct the highlighted fields.', v.errors);

  const record = { id, name, email, organization, subject, message, source_page: sourcePage(fields) };
  try {
    await env.DB.prepare('INSERT INTO contact_messages (id, name, email, organization, subject, message, source_page) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, name, email, organization, subject, message, record.source_page)
      .run();
  } catch (err) {
    if (isDuplicate(err)) return success(request, REDIRECT);
    throw err;
  }
  ctx.waitUntil(
    Promise.all([
      forwardToCrm(env, 'contact_messages', 'general_contact', record),
      notifyTeam(env, 'New general inquiry', [`Record ID: ${id}`, 'Open the customer-management system for details.']),
    ]),
  );
  return success(request, REDIRECT);
}
