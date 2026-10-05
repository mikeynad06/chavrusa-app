interface ApiError {
  response?: { status?: number; data?: { message?: string | string[] } };
}

// The auth endpoints are rate limited; a 429 carries a "please wait N minutes" message worth showing as-is.
export function rateLimitMessage(err: unknown): string | null {
  const response = (err as ApiError)?.response;
  if (response?.status !== 429) return null;
  const message = response.data?.message;
  return typeof message === 'string' && message ? message : 'Too many attempts. Please wait a few minutes and try again.';
}
