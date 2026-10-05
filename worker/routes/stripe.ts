import type { Env } from '../lib/env';
import { hmacHex } from '../lib/integrations';

const TOLERANCE_SECONDS = 300;

/**
 * Stripe webhook. This is the only place an application or registration is
 * marked paid; visiting a success URL never does it.
 */
export async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('Webhook not configured', { status: 503 });
  const payload = await request.text();
  const header = request.headers.get('Stripe-Signature') || '';
  if (!(await verifyStripeSignature(payload, header, env.STRIPE_WEBHOOK_SECRET))) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(payload) as {
    id: string;
    type: string;
    data: { object: { client_reference_id?: string | null; amount_total?: number; currency?: string; payment_status?: string } };
  };

  const fulfil = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded';
  if (!fulfil) return new Response('Ignored', { status: 200 });

  const session = event.data.object;
  const applicationId = session.client_reference_id ?? null;

  // Idempotent: Stripe may deliver the same event more than once.
  const inserted = await env.DB.prepare(
    'INSERT OR IGNORE INTO payments (stripe_event_id, type, application_id, amount_total, currency, payment_status) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(event.id, event.type, applicationId, session.amount_total ?? null, session.currency ?? null, session.payment_status ?? null)
    .run();

  if (inserted.meta.changes > 0 && applicationId && session.payment_status === 'paid') {
    await env.DB.prepare("UPDATE event_applications SET payment_status = 'paid' WHERE id = ?").bind(applicationId).run();
  }
  return new Response('OK', { status: 200 });
}

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(',').map((p) => p.split('=') as [string, string]);
  const timestamp = parts.find(([k]) => k === 't')?.[1];
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  return signatures.some((sig) => timingSafeEqual(sig, expected));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
