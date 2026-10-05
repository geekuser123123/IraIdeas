import type { Env } from './env';
import { failure, type Fields } from './http';
import { isBot, rateLimited, verifyTurnstile } from './security';

/**
 * Shared spam and abuse checks. Returns a Response to send immediately, or
 * null when the submission may proceed. Bots that fill the hidden field are
 * shown a normal success redirect so they learn nothing.
 */
export async function guard(env: Env, request: Request, fields: Fields, route: string, okRedirect: string): Promise<Response | null> {
  if (isBot(fields)) {
    return (request.headers.get('Accept') || '').includes('application/json')
      ? Response.json({ ok: true, redirect: okRedirect })
      : new Response(null, { status: 303, headers: { Location: okRedirect } });
  }
  if (!(await verifyTurnstile(env, fields, request))) {
    return failure(request, 400, 'We could not verify this submission. Please complete the verification and try again.');
  }
  if (await rateLimited(env, request, route)) {
    return failure(request, 429, 'Too many submissions from this connection. Please wait a few minutes and try again.');
  }
  return null;
}

/** True when an INSERT failed because this submission ID was already saved. */
export function isDuplicate(err: unknown): boolean {
  return String(err).includes('UNIQUE constraint failed');
}
