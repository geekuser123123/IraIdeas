export type Fields = Record<string, string>;
export type FieldErrors = Record<string, string>;

/** Reads a JSON or form-encoded body into a flat string map. */
export async function readFields(request: Request): Promise<Fields> {
  const type = request.headers.get('Content-Type') || '';
  const out: Fields = {};
  if (type.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string') out[k] = v;
      else if (typeof v === 'boolean') out[k] = v ? 'on' : '';
      else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string').join(',');
    }
    return out;
  }
  const form = await request.formData();
  for (const key of new Set(form.keys())) {
    out[key] = form
      .getAll(key)
      .filter((v): v is string => typeof v === 'string')
      .join(',');
  }
  return out;
}

function wantsJson(request: Request): boolean {
  return (request.headers.get('Accept') || '').includes('application/json');
}

/** Success: JSON for scripted submissions, a 303 redirect for plain HTML forms. */
export function success(request: Request, redirect: string): Response {
  if (wantsJson(request)) return Response.json({ ok: true, redirect });
  return new Response(null, { status: 303, headers: { Location: redirect } });
}

/**
 * Failure. Scripted forms keep the visitor's entries on the page and show
 * these messages inline. Plain HTML forms get a short page that sends the
 * visitor back, where the browser restores what they typed.
 */
export function failure(request: Request, status: number, message: string, errors: FieldErrors = {}): Response {
  if (wantsJson(request)) return Response.json({ ok: false, message, errors }, { status });
  const items = Object.values(errors)
    .map((e) => `<li>${escapeHtml(e)}</li>`)
    .join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Please check your submission | IRA Ideas</title>
<style>body{font:18px/1.6 Roboto,system-ui,sans-serif;background:#F7F4EE;color:#1F1F22;max-width:640px;margin:0 auto;padding:48px 16px}
h1{font-family:Georgia,serif;font-weight:400}a{color:#8C6F3B}</style></head>
<body><h1>Please check your submission</h1><p>${escapeHtml(message)}</p>${items ? `<ul>${items}</ul>` : ''}
<p><a href="javascript:history.back()">Go back to the form</a>. Your entries should still be there.</p></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Non-identifying attribution fields only. */
export function attribution(fields: Fields): string {
  const keys = ['referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'landing_page'];
  const out: Record<string, string> = {};
  for (const k of keys) if (fields[k]) out[k] = fields[k].slice(0, 300);
  return JSON.stringify(out);
}
