/**
 * Conversion tracking. Only allowlisted, non-identifying properties are sent:
 * never names, emails, phone numbers, amounts, or free text.
 */
type Props = { service?: string; event_slug?: string; list?: string; format?: string };
const ALLOWED: (keyof Props)[] = ['service', 'event_slug', 'list', 'format'];

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

export function track(name: string, props: Props = {}): void {
  const clean: Record<string, string> = { page_path: location.pathname };
  for (const k of ALLOWED) {
    const v = props[k];
    if (v && /^[a-z0-9-]{1,80}$/.test(v)) clean[k] = v;
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...clean });
  window.gtag?.('event', name, clean);
}
