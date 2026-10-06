import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Finds an optional site photo at public/images/site/<name>.(webp|jpg|jpeg|png).
 * Returns its public path, or null so the page can show a placeholder instead.
 */
export function siteImage(name: string): string | null {
  for (const ext of ['webp', 'jpg', 'jpeg', 'png']) {
    const path = `/images/site/${name}.${ext}`;
    if (existsSync(join(process.cwd(), 'public', path))) return path;
  }
  return null;
}
