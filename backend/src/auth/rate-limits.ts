import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';

const MINUTE = 60_000;

// Per client IP, per route (the throttler keys on controller + handler + IP).
// Used with @UseGuards(ThrottlerGuard) on the auth routes only; nothing else is rate limited.
export const AUTH_RATE_LIMITS = {
  login: { default: { limit: 10, ttl: MINUTE } },
  register: { default: { limit: 5, ttl: 60 * MINUTE } },
  forgotPassword: { default: { limit: 5, ttl: 15 * MINUTE } },
  // reset-password, verify-email and resend-verification
  standard: { default: { limit: 10, ttl: 15 * MINUTE } },
};

// Message for the 429 response. timeToBlockExpire is in seconds (also sent as the Retry-After header).
export function rateLimitMessage(_context: ExecutionContext, detail: ThrottlerLimitDetail): string {
  const minutes = Math.max(1, Math.ceil(detail.timeToBlockExpire / 60));
  return `Too many attempts. Please wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and try again.`;
}
