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

// The on/off switch for the Privacy Policy and Terms of Service.
//
//   >>> PLACEHOLDER: replace '[DATE]' with the "Last updated" date shown inside docs/legal/privacy-policy.md
//       and docs/legal/terms-of-service.md (currently "October 6, 2026"). Keep it matching those documents. <<<
//
// The value itself isn't displayed (the documents carry their own date). While it's still '[DATE]' or blank,
// the footer links and the "By creating an account you agree…" lines are hidden, and /privacy and /terms
// redirect to the home page. Once it's set, all of them appear.
export const LEGAL_DATE = '[DATE]';

export const legalPagesEnabled: boolean = !isPlaceholder(LEGAL_DATE);
