export type Band = 'white' | 'light';

/**
 * Picks alternating backgrounds for a run of sections so that no two
 * neighbouring sections share a colour, even when some sections are
 * conditional. Pass the keys of the sections that will render, in order
 * (falsy entries are skipped). `fixed` pins a section to a background, and
 * `before` is the background of whatever precedes the run.
 */
export function bands(keys: (string | false | null | undefined)[], fixed: Record<string, Band> = {}, before: Band | 'dark' = 'dark'): Record<string, Band> {
  const present = keys.filter((k): k is string => Boolean(k));
  const out: Record<string, Band> = {};
  const flip = (b: Band | 'dark'): Band => (b === 'white' ? 'light' : 'white');
  // Sections before the last pinned one: work backwards from the pin.
  const lastPinned = present.reduce((acc, k, i) => (fixed[k] ? i : acc), -1);
  for (let i = lastPinned; i >= 0; i--) {
    const key = present[i];
    out[key] = fixed[key] ?? flip(out[present[i + 1]]);
  }
  // Sections after it (or all of them, if nothing is pinned): alternate forwards.
  let prev: Band | 'dark' = lastPinned >= 0 ? out[present[lastPinned]] : before;
  for (let i = lastPinned + 1; i < present.length; i++) {
    out[present[i]] = prev === 'white' ? 'light' : 'white';
    prev = out[present[i]];
  }
  return out;
}

/** Class name for a band. White sections need no extra class. */
export const bandClass = (band: Band | undefined) => (band === 'light' ? 'theme-light' : '');
