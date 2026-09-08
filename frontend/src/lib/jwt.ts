export function decodeJwtUserId(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const decoded = JSON.parse(json);
    return typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}
