export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  EMAIL_FROM?: string;
  TEAM_NOTIFY_EMAIL?: string;
  TURNSTILE_SECRET?: string;
  CRM_WEBHOOK_URL?: string;
  CRM_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  IP_HASH_SALT?: string;
}
