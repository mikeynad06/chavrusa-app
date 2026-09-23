import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } catch {
      // Intentionally ignored -- we show the same generic message either way.
    } finally {
      setSubmitting(false);
      setSubmitted(true);
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
