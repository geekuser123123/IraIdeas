import type { Env } from '../lib/env';
import { attribution, failure, readFields, success } from '../lib/http';
import { guard, isDuplicate } from '../lib/guard';
import { Validator, sourcePage } from '../lib/validate';
import { loadCatalog } from '../lib/catalog';
import { forwardToCrm, notifyTeam, sendEmail } from '../lib/integrations';

const REDIRECT = '/thank-you/request';
const CONTACTING_FOR = ['myself', 'business', 'client'] as const;
const TIMING = ['exploring', 'upcoming', 'deadline'] as const;
const AMOUNTS = ['under-250k', '250k-1m', '1m-5m', 'over-5m', 'prefer-not'] as const;
const RESPONSE = ['email', 'phone'] as const;

export async function handleInquiry(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const fields = await readFields(request);
  const blocked = await guard(env, request, fields, 'inquiry', REDIRECT);
  if (blocked) return blocked;

  const catalog = await loadCatalog(env, request);
  const subjects = ['not-sure', ...catalog.subjects, ...catalog.services.map((s) => s.slug)];

  const v = new Validator(fields);
  const id = v.submissionId();
  const name = v.text('name', 'Name', { required: true, max: 120 });
  const email = v.email('email');
  const preferred = v.choice('preferred_response', 'a preferred response', RESPONSE);
  const phone = v.phone('phone', preferred === 'phone');
  const region = v.text('region', 'State or country', { required: true, max: 80 });
  const contactingFor = v.choice('contacting_for', 'who you are contacting us for', CONTACTING_FOR);
  const subject = v.choice('subject', 'a service or subject', subjects);
  const goal = v.text('goal', 'What you are trying to accomplish', { required: true, max: 600 });
  const inPlace = v.text('in_place', 'What is already in place', { max: 600 });
  const timing = v.choice('timing', 'your timing', TIMING);
  const deadline = v.date('deadline', 'Deadline date', timing === 'deadline');
  const amount = v.choice('amount_range', 'an approximate amount', AMOUNTS, false);
  const marketing = v.checked('marketing_email_optin');
  const sms = v.checked('sms_optin');
  if (sms && !phone) v.errors.phone = 'Please add a phone number to receive text messages.';

  if (!v.ok) return failure(request, 422, 'Please correct the highlighted fields.', v.errors);

  const record = {
    id,
    name,
    email,
    phone,
    region,
    contacting_for: contactingFor,
    subject,
    goal,
    in_place: inPlace,
    timing,
    deadline: timing === 'deadline' ? deadline : null,
    amount_range: amount,
    preferred_response: preferred,
    marketing_email_optin: marketing ? 1 : 0,
    sms_optin: sms ? 1 : 0,
    source_page: sourcePage(fields),
    attribution: attribution(fields),
  };

  try {
    const cols = Object.keys(record);
    await env.DB.prepare(`INSERT INTO service_inquiries (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
      .bind(...Object.values(record))
      .run();
  } catch (err) {
    // Same submission sent twice (double click, retry): already saved, so confirm again.
    if (isDuplicate(err)) return success(request, REDIRECT);
    throw err;
  }

  ctx.waitUntil(
    Promise.all([
      forwardToCrm(env, 'service_inquiries', 'service_inquiry', record),
      sendEmail(
        env,
        email!,
        'Your request has been received | IRA Ideas',
        [
          `Hello ${name},`,
          '',
          'Your request has been received.',
          '',
          'Our team will review the information you submitted and contact you about the appropriate next step. This may include a request for more information or a proposed paid consultation or engagement.',
          '',
          'No appointment has been scheduled.',
          '',
          'Please do not reply with confidential documents or sensitive account information. The team will provide instructions if additional information is needed.',
          '',
          'IRA Ideas',
          'Advanced Retirement & Tax Strategies',
        ].join('\n'),
      ),
      notifyTeam(env, `New service request: ${subject}`, [
        `Subject: ${subject}`,
        `Timing: ${timing}${record.deadline ? ` (deadline ${record.deadline})` : ''}`,
        `Source page: ${record.source_page ?? 'unknown'}`,
        `Record ID: ${id}`,
        '',
        'Open the customer-management system for the full request.',
      ]),
    ]),
  );

  return success(request, REDIRECT);
}
