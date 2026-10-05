-- Public form submissions. Access to this database is restricted to the
-- Cloudflare account; nothing here is exposed through the public site.

CREATE TABLE service_inquiries (
  id TEXT PRIMARY KEY,                 -- client-generated UUID, prevents duplicate submissions
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  region TEXT NOT NULL,
  contacting_for TEXT NOT NULL,
  subject TEXT NOT NULL,               -- service slug, category slug, or "not-sure"
  goal TEXT NOT NULL,
  in_place TEXT,
  timing TEXT NOT NULL,
  deadline TEXT,
  amount_range TEXT,
  preferred_response TEXT NOT NULL,
  marketing_email_optin INTEGER NOT NULL DEFAULT 0,
  sms_optin INTEGER NOT NULL DEFAULT 0,
  source_page TEXT,
  attribution TEXT,                    -- JSON: referrer, utm_* fields
  crm_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE event_applications (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  kind TEXT NOT NULL,                  -- "application" or "registration"
  event_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  region TEXT,
  participant_role TEXT NOT NULL,
  reason TEXT,
  interests TEXT,
  price_acknowledged INTEGER NOT NULL,
  marketing_email_optin INTEGER NOT NULL DEFAULT 0,
  source_page TEXT,
  attribution TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending',   -- pending / accepted / declined (set by the team)
  payment_status TEXT NOT NULL DEFAULT 'unpaid',   -- changed only by the verified Stripe webhook
  crm_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE signups (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  list TEXT NOT NULL,                  -- "learning" or "priority"
  email TEXT NOT NULL,
  first_name TEXT,
  format_interest TEXT,
  source_page TEXT,
  attribution TEXT,
  crm_status TEXT NOT NULL DEFAULT 'pending',
  UNIQUE (list, email)
);

CREATE TABLE contact_messages (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  message TEXT NOT NULL,
  source_page TEXT,
  crm_status TEXT NOT NULL DEFAULT 'pending'
);

-- Verified Stripe events. The Stripe event ID makes webhook processing idempotent.
CREATE TABLE payments (
  stripe_event_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  type TEXT NOT NULL,
  application_id TEXT,
  amount_total INTEGER,
  currency TEXT,
  payment_status TEXT
);

-- Simple per-IP rate limiting. IPs are stored only as salted hashes.
CREATE TABLE rate_events (
  ip_hash TEXT NOT NULL,
  route TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX rate_events_lookup ON rate_events (ip_hash, route, created_at);
