/**
 * IRA Ideas API Worker.
 *
 * Pages are static files served by Cloudflare's asset handler. This Worker
 * only runs for /api/* (see run_worker_first in wrangler.jsonc) and handles
 * form submissions and the Stripe webhook.
 */
import { handleInquiry } from './routes/inquiry';
import { handleApplication } from './routes/application';
import { handleSignup } from './routes/signup';
import { handleContact } from './routes/contact';
import { handleStripeWebhook } from './routes/stripe';
import type { Env } from './lib/env';

const ROUTES: Record<string, (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response>> = {
  '/api/inquiry': handleInquiry,
  '/api/event-application': handleApplication,
  '/api/signup': handleSignup,
  '/api/contact': handleContact,
  '/api/stripe/webhook': handleStripeWebhook,
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const handler = ROUTES[url.pathname];
    if (!handler) {
      if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
      return env.ASSETS.fetch(request);
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    }
    try {
      return await handler(request, env, ctx);
    } catch (err) {
      console.error('Unhandled API error', url.pathname, err);
      return new Response(JSON.stringify({ ok: false, message: 'Something went wrong. Please try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
} satisfies ExportedHandler<Env>;
