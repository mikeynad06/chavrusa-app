// Contact details shown on the site ("Report a problem" links).
//
// If a value here is ever set back to a [PLACEHOLDER] (or isn't a valid-looking address), everything that
// depends on it is hidden, so a broken "mailto:[...]" link can never go live.
export const SUPPORT_EMAIL = 'admin@findachavrusa.org';

// Anything still in [SQUARE BRACKETS], or blank, counts as not filled in yet.
export function isPlaceholder(value: string): boolean {
  const v = value.trim();
  return v === '' || /^\[.*\]$/.test(v);
}

// The support address once it's been filled in with a real email, otherwise null.
export const supportEmail: string | null =
  !isPlaceholder(SUPPORT_EMAIL) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(SUPPORT_EMAIL.trim()) ? SUPPORT_EMAIL.trim() : null;
