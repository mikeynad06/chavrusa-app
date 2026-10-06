import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { rateLimitMessage } from '../lib/apiError';

// Landing page for the emailed deletion link (Google-only accounts). It's a logged-in page, and deleting
// needs a button press: email scanners open links automatically, so it must never delete just by loading.
export default function DeleteAccountConfirm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/users/me/confirm-deletion', { token });
      navigate('/', { replace: true, state: { accountDeleted: true } });
    } catch (err) {
      const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(
        rateLimitMessage(err) ??
          (typeof message === 'string' && message ? message : 'Could not delete your account. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[560px] px-6 pb-[84px] pt-16">
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-brass-dark">Delete account</span>
      <h1 className="mt-3 font-serif text-[clamp(28px,3.4vw,36px)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink">
        {token ? 'Delete your Chavrusa account?' : 'This link is incomplete'}
      </h1>

      {token ? (
        <>
          <p className="mt-4 text-[16px] leading-[1.65] text-ink-muted">
            This permanently deletes your profile, your requests, and every match you're in, including the messages.
            The people you're matched with will be told. This can't be undone.
          </p>
          {error && (
            <p role="alert" className="mt-4 text-[14px] text-red-700">
              {error}
            </p>
          )}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-full border border-red-700 bg-red-700 px-6 py-[13px] text-[15px] font-semibold text-white transition-colors hover:border-red-800 hover:bg-red-800 disabled:opacity-60"
            >
              {submitting ? 'Deleting…' : 'Delete my account permanently'}
            </button>
            <Link to="/" className="text-[14.5px] font-semibold text-brass-dark hover:text-ink hover:underline">
              Keep my account
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-4 text-[16px] leading-[1.65] text-ink-muted">
          Open the link from the email again, or request a new one from your Profile page.
        </p>
      )}
    </div>
  );
}
