// Contact details you need to fill in before they're shown on the site.
//
//   >>> PLACEHOLDER: replace '[YOUR SUPPORT EMAIL]' below with the real address, e.g. 'support@findachavrusa.org'. <<<
//
// While it's still a placeholder (or isn't a valid-looking address), everything that depends on it stays
// hidden, so a broken "mailto:[YOUR SUPPORT EMAIL]" link can never go live.
export const SUPPORT_EMAIL = '[YOUR SUPPORT EMAIL]';

// Anything still in [SQUARE BRACKETS], or blank, counts as not filled in yet.
export function isPlaceholder(value: string): boolean {
  const v = value.trim();
  return v === '' || /^\[.*\]$/.test(v);
}

// The support address once it's been filled in with a real email, otherwise null.
export const supportEmail: string | null =
  !isPlaceholder(SUPPORT_EMAIL) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(SUPPORT_EMAIL.trim()) ? SUPPORT_EMAIL.trim() : null;
