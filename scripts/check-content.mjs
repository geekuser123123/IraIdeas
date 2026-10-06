// Post-build content checks. Fails the build on rules that must never ship,
// and lists launch blockers that still need business approval.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Read .env the same way Astro does, so a local PUBLIC_SHOW_DRAFTS=true is respected.
try {
  process.loadEnvFile('.env');
} catch {}

const DIST = 'dist';
const showDrafts = process.env.PUBLIC_SHOW_DRAFTS === 'true';
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) files.push(p);
  }
})(DIST);


// Background of each top-level section inside <main>, used to catch two
// neighbouring sections that share a background colour.
const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'col', 'embed', 'track']);
function sectionBackgrounds(html) {
  const start = html.indexOf('<main');
  const end = html.lastIndexOf('</main>');
  if (start < 0 || end < 0) return [];
  const body = html.slice(start, end).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const out = [];
  let depth = 0;
  for (const m of body.matchAll(/<(\/?)([a-zA-Z0-9-]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = m;
    const name = tag.toLowerCase();
    if (closing) { depth--; continue; }
    if (depth === 1 && ['section', 'nav', 'div', 'article', 'header'].includes(name)) {
      const cls = (attrs.match(/class="([^"]*)"/) || [, ''])[1].split(/\s+/);
      if (!cls.includes('anchor') && !cls.includes('overlay') && !cls.includes('variant')) {
        const bg = cls.includes('theme-darker') || cls.includes('conf-hero') ? 'navy'
          : cls.includes('theme-dark') || cls.includes('hero') ? 'teal'
          : cls.includes('theme-light') || cls.includes('priority') ? 'light'
          : 'white';
        out.push(bg);
      }
    }
    if (!VOID.has(name) && !selfClosing) depth++;
  }
  return out;
}

const errors = [];
const warnings = new Set();
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  // Visible text and attributes only: drop scripts and styles first.
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  if (/[—–]|&mdash;|&ndash;|&#8212;|&#8211;/.test(text)) errors.push(`${file}: contains an em dash or en dash (house style: none on any page)`);
  if (!showDrafts && /PLACEHOLDER/.test(text)) errors.push(`${file}: placeholder content in a production build`);
  if (!showDrafts && /class="draft-flag"/.test(text)) errors.push(`${file}: draft content in a production build`);
  const bands = sectionBackgrounds(html);
  for (let i = 1; i < bands.length; i++) {
    if (bands[i] === bands[i - 1]) errors.push(`${file}: sections ${i} and ${i + 1} both have a ${bands[i]} background`);
  }
  if (/data-pending-legal/.test(text)) warnings.add(`${file.replace(DIST, '')}: legal text needs professional review before launch`);
}

const site = JSON.parse(readFileSync('src/data/site.json', 'utf8'));
if (!site.contact.email && !site.contact.phone) warnings.add('site.json: no approved contact email or phone');
if (!site.legalEntityName) warnings.add('site.json: legal entity name not approved yet');
if (!process.env.PUBLIC_TURNSTILE_SITE_KEY) warnings.add('PUBLIC_TURNSTILE_SITE_KEY not set: spam protection relies on the honeypot and rate limiting only');

if (warnings.size) {
  console.log('\nLaunch checklist (not blocking this build):');
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.error('\nContent check failed:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`\nContent check passed (${files.length} pages).`);
