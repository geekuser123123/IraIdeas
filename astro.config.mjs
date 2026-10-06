// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Pages that must never appear in search results or the sitemap.
const NOINDEX = ['/thank-you', '/data', '/404', '/private-strategy-intensive'];

export default defineConfig({
  site: process.env.SITE_URL || 'https://iraideas.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    sitemap({
      filter: (page) => !NOINDEX.some((p) => new URL(page).pathname.startsWith(p)),
    }),
  ],
});
