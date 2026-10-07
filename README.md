# IRA Ideas website

Public website for **IRA Ideas, Advanced Retirement & Tax Strategies**: Advanced Services, Conferences, and Advanced Learning, with attorney Tim Berry.

- **Pages:** [Astro](https://astro.build), built to static HTML (fast, and readable by search engines).
- **Hosting and forms:** a Cloudflare Worker serves the pages and handles `/api/*`.
- **Database:** Cloudflare D1 stores form submissions.
- **Payments:** Stripe. A place is marked paid only by the signed Stripe webhook, never by a page visit.

## Design

| Token | Value |
|---|---|
| Charcoal (main dark) | `#1C1C1E` |
| Near-black | `#121214` |
| Warm white (reading) | `#F7F4EE` |
| Ink (text) | `#1F1F22` |
| Muted gold (accent, buttons) | `#B8975A` |
| Deep gold (gold text on light) | `#8C6F3B` |
| Headings | Source Serif 4 (self-hosted) |
| Subheadings, body, buttons | Inter (self-hosted) |

House style: no em dashes or en dashes anywhere. `npm run build` fails if one appears in a page.

## Local development

```sh
npm install
npm run dev                         # pages only, http://localhost:4321
# Full site with the API and a local database:
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run preview                     # http://localhost:8787
```

Set `PUBLIC_SHOW_DRAFTS=true` to render draft and review content (staging only).

## Editing content

Content lives in `src/content/` as Markdown files with a front-matter block:

| Folder | What it holds |
|---|---|
| `services/` | One file per approved service. Copy `example-service.md`. |
| `events/` | One file per event. The `status` field drives the button on every page. Copy `example-event.md`. |
| `resources/`, `courses/` | Advanced Learning |
| `people/` | Tim and approved team members |
| `testimonials/` | Approved testimonials, with a permission record |
| `src/data/site.json` | Contact details, Client Login and other external links, legal entity name |

Every entry has `publication: draft | review | published`. Only `published` appears on the live site.
Missing business content stays unpublished; the build fails if `PLACEHOLDER` text reaches production.

## Photos

Photo spots show a branded placeholder until a photo is added to `public/images/site/`
with the matching name (`.webp`, `.jpg` or `.png`; landscape, at least 1600px wide, about 16:9):

| File name | Where it appears |
|---|---|
| `home-conference` | Homepage, "Go deeper in the room." |
| `home-learning` | Homepage, "Free advanced learning is on the way." |
| `about-how-we-work` | About page, "How we work." |
| `learn-hero` | Advanced Learning hero background (right side shows through) |
| `conferences-hero` | Conferences hero background (right side shows through) |
| `conferences-priority` | Conferences, background behind "Be first to hear about the next event." |

Use real photos of IRA Ideas events where possible. Never use stock photos of people presented as clients or staff.

Disclosure wording lives in `src/data/disclosures.json`. Only sections marked `"approved": true` appear on the live site; the build lists any still pending.

Event formats shown on the Conferences page are switched on or off in `src/data/formats.json`.

## Deploying to Cloudflare

1. Create the database and copy its ID into `wrangler.jsonc`:
   `npx wrangler d1 create iraideas`, then `npm run db:migrate:remote`
2. In the Cloudflare dashboard, go to **Workers & Pages**, then **Create**, then **Import a repository**, and pick this repository.
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Build variables: `SITE_URL`, `PUBLIC_TURNSTILE_SITE_KEY`, optionally `PUBLIC_GA_ID`
3. Add secrets (Worker, **Settings**, **Variables and Secrets**), as each service is approved:
   `TURNSTILE_SECRET`, `CRM_WEBHOOK_URL`, `CRM_WEBHOOK_SECRET`, `RESEND_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `IP_HASH_SALT`.
   Set `EMAIL_FROM` and `TEAM_NOTIFY_EMAIL` as variables.
4. In Stripe, point a webhook at `https://<domain>/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   For direct-registration events, set `paymentUrl` to the approved Payment Link. The site appends `client_reference_id` automatically.

## Analytics events

`service_inquiry_started`, `service_inquiry_submitted`, `event_application_submitted`, `priority_list_signup`, `learning_signup`.
They carry only page path and service, event, or list slugs. Names, emails, phone numbers, amounts, and free text are never sent.
Payment confirmation is recorded server-side in the `payments` table.
