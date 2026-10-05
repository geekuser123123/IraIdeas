import type { APIRoute } from 'astro';
import { CATEGORY_SLUGS } from '../../data/categories';
import { visible } from '../../lib/content';

/**
 * Build-time export of what this build publishes, so the API Worker validates
 * form choices against the same records the pages were built from.
 */
export const GET: APIRoute = async () => {
  const services = await visible('services');
  const events = await visible('events');
  return new Response(
    JSON.stringify({
      services: services.map((s) => ({ slug: s.id, name: s.data.name })),
      subjects: [...CATEGORY_SLUGS],
      events: events.map((e) => ({
        slug: e.id,
        title: e.data.title,
        status: e.data.status,
        price: e.data.price,
        paymentUrl: e.data.paymentUrl ?? null,
      })),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
