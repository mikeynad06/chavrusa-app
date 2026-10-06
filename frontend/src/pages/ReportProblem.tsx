import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { decodeJwtEmail } from '../lib/jwt';
import { safeNextPath } from '../lib/redirect';
import { rateLimitMessage } from '../lib/apiError';
import { SUPPORT_EMAIL } from '../config/legal';

interface ApiError {
  response?: { data?: { message?: string | string[] } };
}

function errorMessage(err: unknown): string {
  const limited = rateLimitMessage(err);
  if (limited) return limited;
  const message = (err as ApiError)?.response?.data?.message;
  if (Array.isArray(message) && message[0]) return message[0];
  if (typeof message === 'string' && message) return message;
  return `We couldn't send your report just now. Please email us directly at ${SUPPORT_EMAIL}.`;
}

// "Report a problem": a form that the server emails to the support inbox. Reached from the footer and the
// chat header, with ?from=<page> and ?match=<id> so the report says where it came from.
export default function ReportProblem() {
  const [searchParams] = useSearchParams();
  const fromPage = safeNextPath(searchParams.get('from'));
  const matchId = (searchParams.get('match') || '').slice(0, 100) || null;
  const { token } = useAuth();

  const [email, setEmail] = useState(() => (token ? decodeJwtEmail(token) ?? '' : ''));
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, hidden from people
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Report a problem — Chavrusa';
    return () => {
      document.title = previous;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/support/report', {
        email: email.trim(),
        message: message.trim(),
        ...(fromPage ? { page: fromPage } : {}),
        ...(matchId ? { matchId } : {}),
        ...(website ? { website } : {}),
      });
      setSentTo(email.trim());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-[10px] border border-border bg-surface px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none';
  const tooShort = message.trim().length < 10;

  return (
    <div className="mx-auto max-w-[560px] px-6 pb-[84px] pt-16">
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-brass-dark">Support</span>
      <h1 className="mt-3 font-serif text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink">
        {sentTo ? 'Thanks, we got your report.' : 'Report a problem'}
      </h1>

      {sentTo ? (
        <div role="status">
          <p className="mt-4 text-[16px] leading-[1.65] text-ink-muted">
            We'll look into it and reply to <span className="font-semibold text-ink">{sentTo}</span> if we need more
            details.
          </p>
          <Link
            to={fromPage ?? '/'}
            className="mt-7 inline-block rounded-full border border-ink bg-ink px-7 py-[13px] text-[15px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass"
          >
            {fromPage ? 'Back to where you were' : 'Go home'}
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-3 text-[16px] leading-[1.65] text-ink-muted">
            Tell us what went wrong. It goes straight to the people who run Chavrusa, and we'll reply by email.
          </p>

          <form onSubmit={handleSubmit} className="mt-7" noValidate={false}>
            <label htmlFor="report-email" className="mb-[7px] block text-[13px] font-semibold text-ink-muted">
              Your email
            </label>
            <input
              id="report-email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`${inputClass} mb-[18px]`}
            />

            <label htmlFor="report-message" className="mb-[7px] block text-[13px] font-semibold text-ink-muted">
              What happened?
            </label>
            <textarea
              id="report-message"
              required
              minLength={10}
              maxLength={5000}
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-describedby="report-message-hint"
              placeholder="What were you doing, what did you expect, and what happened instead?"
              className={`${inputClass} resize-y`}
            />
            <p id="report-message-hint" className="mt-2 text-[13px] text-ink-muted">
              {fromPage || matchId
                ? `We'll include where you came from${fromPage ? ` (${fromPage})` : ''}${matchId ? ` and the match` : ''}.`
                : 'At least 10 characters.'}
            </p>

            {/* Honeypot: invisible to people and skipped by keyboard and screen readers; bots tend to fill it. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="report-website">Website</label>
              <input
                id="report-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="mt-4 text-[13.5px] text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || tooShort || email.trim() === ''}
              className="mt-6 w-full rounded-full border border-ink bg-ink py-[15px] text-[15.5px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Send report'}
            </button>
          </form>

          <p className="mt-6 text-[14px] text-ink-muted">
            Prefer email? Write to{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-brass-dark underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
