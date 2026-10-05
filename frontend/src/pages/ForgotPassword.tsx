import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { rateLimitMessage } from '../lib/apiError';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      // Rate limited: nothing was sent, so say so instead of claiming a link is on its way.
      const limited = rateLimitMessage(err);
      if (limited) setError(limited);
      // Anything else gets the same generic message as success, so this can't reveal which emails exist.
      else setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col justify-center bg-bg px-10 py-16">
      <div className="mx-auto w-full max-w-[400px]">
        <span className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-brass-dark">
          Reset your password
        </span>
        <h1 className="mt-3 mb-1.5 font-serif text-[38px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
          Forgot password?
        </h1>

        {submitted ? (
          <p className="mt-4 text-[15px] text-ink-muted">
            If an account exists for that email, we've sent a reset link. Check your inbox.
          </p>
        ) : (
          <>
            <p className="mb-[30px] text-[15px] text-ink-muted">
              Enter your email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit}>
              <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mb-5 w-full rounded-[10px] border border-border bg-surface px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
              />

              {error && (
                <p role="alert" className="mb-4 text-[13.5px] text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full border border-ink bg-ink py-[15px] text-[15.5px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <p className="mt-[26px] text-[14px] text-ink-muted">
          <Link to="/login" className="font-semibold text-brass-dark hover:text-ink hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
