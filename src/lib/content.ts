import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';

export const SHOW_DRAFTS = import.meta.env.PUBLIC_SHOW_DRAFTS === 'true';

/** Entries visible on this build: published only, or everything on staging. */
export async function visible<C extends CollectionKey>(collection: C): Promise<CollectionEntry<C>[]> {
  const all = await getCollection(collection);
  return all.filter((e) => SHOW_DRAFTS || (e.data as { publication: string }).publication === 'published');
}

export type EventEntry = CollectionEntry<'events'>;

export const FORMAT_LABELS = {
  live: 'IRA Ideas Live',
  workshop: 'IRA Ideas Advanced Workshop',
  'private-session': 'IRA Ideas Private Advanced Planning Session',
  'private-intensive': 'Private Strategy Intensive with Tim Berry',
} as const;

export const STATUS_LABELS = {
  announced: 'Announced',
  'applications-open': 'Applications open',
  'registration-open': 'Registration open',
  'sold-out': 'Sold out',
  completed: 'Completed',
  postponed: 'Postponed',
  canceled: 'Canceled',
} as const;

/** The single source for what an event's main button says and does. */
export function eventAction(e: EventEntry): { label: string; href: string } | null {
  const base = `/conferences/${e.id}`;
  switch (e.data.status) {
    case 'announced':
    case 'sold-out':
      return { label: 'Join the Priority List', href: `${base}#priority-list` };
    case 'applications-open':
      return { label: 'Apply to Attend', href: `${base}/apply` };
    case 'registration-open':
      return { label: 'Register', href: `${base}/apply` };
    case 'completed':
      return { label: 'View Event Overview', href: base };
    default:
      return null; // postponed or canceled: show the notice instead
  }
}

export function isUpcoming(e: EventEntry): boolean {
  return !['completed', 'canceled'].includes(e.data.status);
}

/** Events that belong in public listings (excludes unlisted team-shared pages). */
export async function listedEvents(): Promise<EventEntry[]> {
  const all = await visible('events');
  return all.filter((e) => !e.data.unlisted).sort((a, b) => a.data.startDate.localeCompare(b.data.startDate));
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const formatPrice = (n: number | null | undefined) => (n == null ? 'Price to be announced' : money.format(n));

/** Formats YYYY-MM-DD dates in the event's timezone, without dashes. */
export function formatDates(start: string, end: string | undefined, timeZone = 'America/Chicago'): string {
  const toDate = (d: string) => new Date(`${d}T12:00:00Z`);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone });
  if (!end || end === start) return fmt.format(toDate(start));
  return `${fmt.format(toDate(start))} to ${fmt.format(toDate(end))}`;
}

export function formatDay(d: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
}
