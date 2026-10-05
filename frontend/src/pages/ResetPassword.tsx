import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { rateLimitMessage } from '../lib/apiError';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(rateLimitMessage(err) ?? 'This reset link is invalid or has expired.');
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
          Choose a new password
        </h1>

        {success ? (
          <p className="mt-4 text-[15px] text-ink-muted">
            Your password has been reset. Redirecting to login…
          </p>
        ) : !token ? (
          <p className="mt-4 text-[15px] text-red-700">
            This reset link is missing its token. Request a new one from the{' '}
            <Link to="/forgot-password" className="font-semibold text-brass-dark hover:text-ink hover:underline">
              forgot password
            </Link>{' '}
            page.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-[30px]">
            <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">
              New password
            </label>
            <div className="relative mb-5">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-[10px] border border-border bg-surface px-[15px] py-[13px] pr-11 text-[15px] text-ink focus:border-border-strong focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink-muted hover:text-ink"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {error && (
              <p className="mb-4 text-[13.5px] text-red-700">
                {error}{' '}
                <Link to="/forgot-password" className="font-semibold underline">
                  Request a new link
                </Link>
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full border border-ink bg-ink py-[15px] text-[15.5px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass disabled:opacity-60"
            >
              {submitting ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
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
