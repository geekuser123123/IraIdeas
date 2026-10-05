import { track } from './track';

const ATTR_KEY = 'iraideas_attribution';
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

/** First-touch attribution for this visit. Holds campaign tags only, never form contents. */
function attribution(): Record<string, string> {
  try {
    const saved = sessionStorage.getItem(ATTR_KEY);
    if (saved) return JSON.parse(saved);
    const params = new URLSearchParams(location.search);
    const data: Record<string, string> = { landing_page: location.pathname };
    if (document.referrer && !document.referrer.startsWith(location.origin)) data.referrer = new URL(document.referrer).origin;
    for (const k of UTM) {
      const v = params.get(k);
      if (v) data[k] = v.slice(0, 100);
    }
    sessionStorage.setItem(ATTR_KEY, JSON.stringify(data));
    return data;
  } catch {
    return {};
  }
}
attribution();

interface Options {
  /** Analytics event fired once the server confirms the record is saved. */
  successEvent: string;
  eventProps?: (form: HTMLFormElement) => Parameters<typeof track>[1];
  /** Fired on the first interaction with the form. */
  startEvent?: string;
}

/**
 * Progressive enhancement for public forms. Without JavaScript the form posts
 * normally. With it: one submission at a time, server errors shown inline
 * next to fields, entries preserved, and success shown only after saving.
 */
export function enhanceForm(form: HTMLFormElement, opts: Options): void {
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const alert = form.querySelector<HTMLElement>('.form-alert');
  let busy = false;

  const setHidden = (name: string, value: string) => {
    let input = form.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.append(input);
    }
    input.value = value;
  };
  setHidden('submission_id', crypto.randomUUID());
  setHidden('source_page', location.pathname);
  for (const [k, v] of Object.entries(attribution())) setHidden(k, v);

  if (opts.startEvent) {
    const start = () => track(opts.startEvent!, opts.eventProps?.(form));
    form.addEventListener('focusin', start, { once: true });
  }

  const clearErrors = () => {
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
    form.querySelectorAll<HTMLElement>('.field-error').forEach((el) => (el.textContent = ''));
    if (alert) {
      alert.hidden = true;
      alert.textContent = '';
    }
  };

  const showErrors = (message: string, errors: Record<string, string>) => {
    let first: HTMLElement | null = null;
    for (const [name, text] of Object.entries(errors)) {
      const input = form.querySelector<HTMLElement>(`[name="${name}"]`);
      const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        first ??= input;
      }
      if (slot) slot.textContent = text;
    }
    if (alert) {
      alert.hidden = false;
      alert.textContent = message;
      if (Object.keys(errors).some((n) => !form.querySelector(`[data-error-for="${n}"]`))) {
        alert.textContent += ' ' + Object.values(errors).join(' ');
      }
    }
    form.dispatchEvent(new CustomEvent('form:errors', { detail: { errors, first } }));
    (alert ?? first)?.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.reportValidity()) return;
    busy = true;
    clearErrors();
    const label = submit?.textContent ?? '';
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Sending...';
    }
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; redirect?: string; message?: string; errors?: Record<string, string> };
      if (res.ok && data.ok && data.redirect) {
        track(opts.successEvent, opts.eventProps?.(form));
        location.assign(data.redirect);
        return; // keep the button disabled while navigating
      }
      showErrors(data.message || 'Something went wrong. Please try again.', data.errors || {});
    } catch {
      showErrors('We could not reach the server. Please check your connection and try again. Your entries have been kept.', {});
    }
    busy = false;
    if (submit) {
      submit.disabled = false;
      submit.textContent = label;
    }
  });
}
