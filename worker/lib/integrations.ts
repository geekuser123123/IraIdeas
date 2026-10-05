import type { Env } from './env';

type Table = 'service_inquiries' | 'event_applications' | 'signups' | 'contact_messages';

/**
 * Sends a saved record to the approved customer-management system through a
 * signed webhook, then records the outcome. Runs after the response is sent;
 * the record is already safely stored, so a CRM outage never loses a request.
 */
export async function forwardToCrm(env: Env, table: Table, type: string, record: Record<string, unknown>): Promise<void> {
  if (!env.CRM_WEBHOOK_URL) return;
  const id = String(record.id);
  try {
    const body = JSON.stringify({ type, record, sent_at: new Date().toISOString() });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (env.CRM_WEBHOOK_SECRET) headers['X-IraIdeas-Signature'] = await hmacHex(env.CRM_WEBHOOK_SECRET, body);
    const res = await fetch(env.CRM_WEBHOOK_URL, { method: 'POST', headers, body });
    await env.DB.prepare(`UPDATE ${table} SET crm_status = ? WHERE id = ?`).bind(res.ok ? 'sent' : `error:${res.status}`, id).run();
  } catch (err) {
    console.error('CRM forward failed', table, id, err);
    await env.DB.prepare(`UPDATE ${table} SET crm_status = 'error' WHERE id = ?`).bind(id).run();
  }
}

/**
 * Transactional email through Resend. Confirmation emails repeat the on-page
 * confirmation and never echo the visitor's free-text details.
 */
export async function sendEmail(env: Env, to: string, subject: string, text: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !to) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
    });
    if (!res.ok) console.error('Email send failed', res.status, await res.text());
  } catch (err) {
    console.error('Email send failed', err);
  }
}

export function notifyTeam(env: Env, subject: string, lines: string[]): Promise<void> {
  if (!env.TEAM_NOTIFY_EMAIL) return Promise.resolve();
  return sendEmail(env, env.TEAM_NOTIFY_EMAIL, subject, lines.join('\n'));
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
