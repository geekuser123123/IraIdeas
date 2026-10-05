import type { Env } from '../lib/env';
import { attribution, failure, readFields, success } from '../lib/http';
import { guard, isDuplicate } from '../lib/guard';
import { Validator, sourcePage } from '../lib/validate';
import { forwardToCrm, sendEmail } from '../lib/integrations';

const LISTS = ['learning', 'priority'] as const;
const FORMATS = ['live', 'workshop', 'private-session', 'any'] as const;

export async function handleSignup(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const fields = await readFields(request);
  const list = fields.list === 'priority' ? 'priority' : 'learning';
  const redirect = list === 'priority' ? '/thank-you/conference?type=priority' : '/thank-you/learning';
  const blocked = await guard(env, request, fields, 'signup', redirect);
  if (blocked) return blocked;

  const v = new Validator(fields);
  const id = v.submissionId();
  v.choice('list', 'a list', LISTS);
  const email = v.email('email');
  const firstName = v.text(list === 'priority' ? 'name' : 'first_name', list === 'priority' ? 'Name' : 'First name', {
    required: list === 'priority',
    max: 120,
  });
  const format = list === 'priority' ? v.choice('format_interest', 'an event format', FORMATS, false) : null;
  if (!v.ok) return failure(request, 422, 'Please correct the highlighted fields.', v.errors);

  const record = { id, list, email, first_name: firstName, format_interest: format, source_page: sourcePage(fields), attribution: attribution(fields) };
  try {
    await env.DB.prepare(
      'INSERT INTO signups (id, list, email, first_name, format_interest, source_page, attribution) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(record.id, record.list, record.email, record.first_name, record.format_interest, record.source_page, record.attribution)
      .run();
  } catch (err) {
    // Already on this list: confirm without revealing whether the address existed.
    if (isDuplicate(err)) return success(request, redirect);
    throw err;
  }

  const text =
    list === 'priority'
      ? 'You have joined the priority list for future IRA Ideas events. We will contact you when relevant event information becomes available. This does not reserve a seat.'
      : 'You have joined the IRA Ideas learning list. We will send new educational resources and learning announcements as they are released.';
  ctx.waitUntil(
    Promise.all([
      forwardToCrm(env, 'signups', `${list}_signup`, record),
      sendEmail(env, email!, list === 'priority' ? 'You are on the IRA Ideas priority list' : 'Welcome to IRA Ideas Advanced Learning', `${text}\n\nIRA Ideas`),
    ]),
  );
  return success(request, redirect);
}
