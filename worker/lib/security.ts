import type { Env } from './env';
import type { Fields } from './http';

/** Hidden field that real visitors never fill in. */
export function isBot(fields: Fields): boolean {
  return Boolean(fields.company_website && fields.company_website.trim());
}

export async function verifyTurnstile(env: Env, fields: Fields, request: Request): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true; // Turnstile not configured yet.
  const token = fields['cf-turnstile-response'];
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = (await res.json().catch(() => ({ success: false }))) as { success?: boolean };
  return data.success === true;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Allows `limit` submissions per IP per route in a rolling window. */
export async function rateLimited(env: Env, request: Request, route: string, limit = 10, windowSeconds = 600): Promise<boolean> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256(`${env.IP_HASH_SALT || 'iraideas'}:${ip}`);
  const now = Math.floor(Date.now() / 1000);
  const since = now - windowSeconds;
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM rate_events WHERE ip_hash = ? AND route = ? AND created_at > ?')
    .bind(ipHash, route, since)
    .first<{ n: number }>();
  if ((row?.n ?? 0) >= limit) return true;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO rate_events (ip_hash, route, created_at) VALUES (?, ?, ?)').bind(ipHash, route, now),
    env.DB.prepare('DELETE FROM rate_events WHERE created_at < ?').bind(now - 86400),
  ]);
  return false;
}
