// Where to go after logging in, carried as ?next=/some/path. Only same-site paths are accepted,
// so a crafted link like /login?next=https://evil.example can't bounce users off-site.

const GOOGLE_NEXT_KEY = 'postLoginNext';
const AUTH_PAGES = ['/login', '/register', '/auth/callback'];

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (AUTH_PAGES.includes(url.pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function loginPathFor(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

// Google sign-in leaves the site and comes back via /auth/callback, so stash the destination for the round trip.
// Every Google button click overwrites (or clears) it, so a stale value can't leak into a later sign-in.
export function rememberNextForGoogle(next: string | null) {
  try {
    if (next) sessionStorage.setItem(GOOGLE_NEXT_KEY, next);
    else sessionStorage.removeItem(GOOGLE_NEXT_KEY);
  } catch {
    // Storage unavailable: the user just lands on the dashboard instead.
  }
}

// Read-only on purpose: React StrictMode runs the callback effect twice, and consuming the value
// on the first run would send the second run to the dashboard instead.
export function nextAfterGoogle(): string | null {
  try {
    return safeNextPath(sessionStorage.getItem(GOOGLE_NEXT_KEY));
  } catch {
    return null;
  }
}
