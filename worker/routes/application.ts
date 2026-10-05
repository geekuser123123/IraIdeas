import type { Env } from '../lib/env';
import { attribution, failure, readFields, success } from '../lib/http';
import { guard, isDuplicate } from '../lib/guard';
import { Validator, isSlug, sourcePage } from '../lib/validate';
import { loadCatalog } from '../lib/catalog';
import { forwardToCrm, notifyTeam, sendEmail } from '../lib/integrations';

const ROLES = ['business-owner', 'investor', 'advisor', 'attorney-cpa', 'other'] as const;

/**
 * Handles both admission flows, which are kept separate:
 *   application:  Application -> team review -> acceptance -> payment -> confirmed
 *   registration: Registration -> payment -> confirmed
 * Neither flow confirms a place here. Only the verified Stripe webhook marks payment.
 */
export async function handleApplication(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const fields = await readFields(request);
  const blocked = await guard(env, request, fields, 'event-application', '/thank-you/conference');
  if (blocked) return blocked;

  const slug = (fields.event_slug || '').trim();
  const catalog = await loadCatalog(env, request);
  const event = isSlug(slug) ? catalog.events.find((e) => e.slug === slug) : undefined;
  if (!event) return failure(request, 404, 'This event could not be found.');

  const kind = event.status === 'applications-open' ? 'application' : event.status === 'registration-open' ? 'registration' : null;
  if (!kind) return failure(request, 409, 'This event is not currently accepting applications or registrations.');

  const v = new Validator(fields);
  const id = v.submissionId();
  const name = v.text('name', 'Name', { required: true, max: 120 });
  const email = v.email('email');
  const phone = v.phone('phone', false);
  const region = v.text('region', 'State or country', { max: 80 });
  const role = v.choice('participant_role', 'your role', ROLES);
  const reason = v.text('reason', 'Reason for attending', { required: kind === 'application', max: 600 });
  const interests = v.text('interests', 'Planning interests', { max: 400 });
  const ack = v.checked('price_acknowledged');
  if (!ack) v.errors.price_acknowledged = 'Please acknowledge the published participation price.';
  const marketing = v.checked('marketing_email_optin');

  if (!v.ok) return failure(request, 422, 'Please correct the highlighted fields.', v.errors);

  const record = {
    id,
    kind,
    event_slug: slug,
    name,
    email,
    phone,
    region,
    participant_role: role,
    reason,
    interests,
    price_acknowledged: 1,
    marketing_email_optin: marketing ? 1 : 0,
    source_page: sourcePage(fields),
    attribution: attribution(fields),
  };

  // Registrations continue to the approved Stripe payment page. client_reference_id
  // ties the payment back to this record when the webhook confirms it.
  const redirect =
    kind === 'registration' && event.paymentUrl
      ? `${event.paymentUrl}${event.paymentUrl.includes('?') ? '&' : '?'}client_reference_id=${id}`
      : `/thank-you/conference?type=${kind}`;

  try {
    const cols = Object.keys(record);
    await env.DB.prepare(`INSERT INTO event_applications (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
      .bind(...Object.values(record))
      .run();
  } catch (err) {
    if (isDuplicate(err)) return success(request, redirect);
    throw err;
  }

  const confirmation =
    kind === 'application'
      ? 'Your application has been received. Our team will review it and contact you about the next step. Your place is not confirmed until the required acceptance and payment steps are complete.'
      : 'Your registration details have been received. Your place is not confirmed until the required payment is complete and verified.';

  ctx.waitUntil(
    Promise.all([
      forwardToCrm(env, 'event_applications', `event_${kind}`, record),
      sendEmail(env, email!, `${event.title}: ${kind === 'application' ? 'application' : 'registration'} received | IRA Ideas`, [
        `Hello ${name},`,
        '',
        confirmation,
        '',
        'IRA Ideas Conferences',
      ].join('\n')),
      notifyTeam(env, `New event ${kind}: ${event.title}`, [`Event: ${event.title}`, `Record ID: ${id}`]),
    ]),
  );

  return success(request, redirect);
}
