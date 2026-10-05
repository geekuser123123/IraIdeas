import data from './site.json';

/**
 * Site settings, editable through the content editor. A null value means the
 * business has not approved it yet, and anything depending on it stays hidden.
 */
export interface SiteSettings {
  brand: string;
  descriptor: string;
  authority: string;
  primaryCta: { label: string; href: string };
  contact: { email: string | null; phone: string | null; address: string | null };
  external: { clientLogin: string | null; existingEngagementSupport: string | null; taxAcademy: string | null };
  legalEntityName: string | null;
  footerDisclosure: string | null;
}

export const site = data as SiteSettings;
