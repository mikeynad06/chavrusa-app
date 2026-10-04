import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

type ResendState = 'idle' | 'sending' | 'sent' | 'error';

export default function VerifyEmailBanner() {
  const { isAuthenticated } = useAuth();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [resend, setResend] = useState<ResendState>('idle');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setVerified(null);
      return;
    }
    api
      .get<{ emailVerified: boolean }>('/auth/verification-status')
      .then((res) => setVerified(res.data.emailVerified))
      .catch(() => setVerified(null));
  }, [isAuthenticated]);

  if (!isAuthenticated || verified !== false) return null;

  const handleResend = async () => {
    setResend('sending');
    setResendError('');
    try {
      await api.post('/auth/resend-verification');
      setResend('sent');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setResendError(message || 'Could not send the email. Please try again.');
      setResend('error');
    }
  };

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 px-6 py-3 text-[14px] text-ink">
        <p>
          <span className="font-semibold">Please verify your email.</span>{' '}
          <span className="text-ink-muted">
            Check your inbox for a verification link. You'll need it before posting or claiming requests.
          </span>
        </p>
        {resend === 'sent' ? (
          <span className="text-[13.5px] text-ink-muted">Sent! Check your inbox.</span>
        ) : (
          <span className="flex items-center gap-3">
            {resend === 'error' && <span className="text-[13.5px] text-red-700">{resendError}</span>}
            <button
              type="button"
              onClick={handleResend}
              disabled={resend === 'sending'}
              className="font-semibold text-brass-dark hover:text-ink hover:underline disabled:opacity-60"
            >
              {resend === 'sending' ? 'Sending…' : 'Resend email'}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
