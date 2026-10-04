import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const { isAuthenticated } = useAuth();
  // The token is single-use, so don't let StrictMode's double effect run submit it twice.
  const submitted = useRef(false);

  useEffect(() => {
    if (!token || submitted.current) return;
    submitted.current = true;
    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  const next = isAuthenticated
    ? { to: '/dashboard', label: 'Go to your dashboard' }
    : { to: '/login', label: 'Log in' };

  return (
    <div className="flex min-h-svh flex-col justify-center bg-bg px-10 py-16">
      <div className="mx-auto w-full max-w-[400px]">
        <span className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-brass-dark">
          Verify your email
        </span>
        <h1 className="mt-3 mb-1.5 font-serif text-[38px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
          {status === 'verifying' && 'Verifying…'}
          {status === 'success' && 'Email verified'}
          {status === 'error' && 'Link not valid'}
        </h1>

        {status === 'verifying' && (
          <p className="mt-4 text-[15px] text-ink-muted">One moment while we confirm your email address.</p>
        )}
        {status === 'success' && (
          <p className="mt-4 text-[15px] text-ink-muted">
            Thanks — your email address is confirmed. You can now post requests and claim matches.
          </p>
        )}
        {status === 'error' && (
          <p className="mt-4 text-[15px] text-red-700">
            This verification link is invalid, has expired, or has already been used. Log in and use the
            "Resend email" button in the banner to get a new link.
          </p>
        )}

        {status !== 'verifying' && (
          <p className="mt-[26px] text-[14px] text-ink-muted">
            <Link to={next.to} className="font-semibold text-brass-dark hover:text-ink hover:underline">
              {next.label}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
