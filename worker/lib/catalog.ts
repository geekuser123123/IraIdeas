import type { Env } from './env';

/**
 * Published services and events are exported at build time to /data/catalog.json
 * from the same content records the pages use, so the API validates against
 * exactly what the site shows.
 */
export interface CatalogService { slug: string; name: string }
export interface CatalogEvent { slug: string; title: string; status: string; price: number | null; paymentUrl: string | null }
export interface Catalog { services: CatalogService[]; subjects: string[]; events: CatalogEvent[] }

export async function loadCatalog(env: Env, request: Request): Promise<Catalog> {
  const url = new URL('/data/catalog.json', request.url);
  const res = await env.ASSETS.fetch(new Request(url));
  if (!res.ok) throw new Error(`Catalog unavailable (${res.status})`);
  return (await res.json()) as Catalog;
}
