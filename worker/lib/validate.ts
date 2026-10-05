import type { FieldErrors, Fields } from './http';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Collects field errors while reading and normalising values. */
export class Validator {
  errors: FieldErrors = {};
  constructor(private fields: Fields) {}

  text(name: string, label: string, opts: { required?: boolean; max?: number } = {}): string | null {
    const value = (this.fields[name] || '').trim();
    if (!value) {
      if (opts.required) this.errors[name] = `${label} is required.`;
      return null;
    }
    const max = opts.max ?? 200;
    if (value.length > max) this.errors[name] = `${label} must be ${max} characters or fewer.`;
    return value.slice(0, max);
  }

  email(name: string, label = 'Email'): string | null {
    const value = this.text(name, label, { required: true, max: 254 });
    if (value && !EMAIL_RE.test(value)) this.errors[name] = 'Please enter a valid email address.';
    return value?.toLowerCase() ?? null;
  }

  phone(name: string, required: boolean): string | null {
    const value = this.text(name, 'Phone', { required, max: 40 });
    if (required && !value) this.errors[name] = 'Please add a phone number so we can call you.';
    if (value && !/^[0-9+().\-\s]{7,40}$/.test(value)) this.errors[name] = 'Please enter a valid phone number.';
    return value;
  }

  choice<T extends string>(name: string, label: string, allowed: readonly T[], required = true): T | null {
    const value = (this.fields[name] || '').trim();
    if (!value) {
      if (required) this.errors[name] = `Please choose ${label.toLowerCase()}.`;
      return null;
    }
    if (!(allowed as readonly string[]).includes(value)) {
      this.errors[name] = `Please choose a valid option for ${label.toLowerCase()}.`;
      return null;
    }
    return value as T;
  }

  date(name: string, label: string, required: boolean): string | null {
    const value = (this.fields[name] || '').trim();
    if (!value) {
      if (required) this.errors[name] = `${label} is required.`;
      return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
      this.errors[name] = `Please enter a valid date for ${label.toLowerCase()}.`;
      return null;
    }
    return value;
  }

  checked(name: string): boolean {
    const v = this.fields[name];
    return v === 'on' || v === 'true' || v === '1' || v === 'yes';
  }

  submissionId(): string | null {
    const value = (this.fields.submission_id || '').trim();
    if (!UUID_RE.test(value)) {
      this.errors.form = 'Please reload the page and try again.';
      return null;
    }
    return value.toLowerCase();
  }

  get ok(): boolean {
    return Object.keys(this.errors).length === 0;
  }
}

export function isSlug(value: string): boolean {
  return SLUG_RE.test(value);
}

/** Origin path of the submitting page, never including the query string. */
export function sourcePage(fields: Fields): string | null {
  const v = (fields.source_page || '').trim();
  return v.startsWith('/') ? v.split('?')[0].split('#')[0].slice(0, 200) : null;
}
