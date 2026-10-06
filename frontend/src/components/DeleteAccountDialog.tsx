import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { rateLimitMessage } from '../lib/apiError';

const CONFIRM_TEXT = 'DELETE';

interface ApiError {
  response?: { status?: number; data?: { message?: string | string[] } };
}

function errorMessage(err: unknown): string {
  const limited = rateLimitMessage(err);
  if (limited) return limited;
  const message = (err as ApiError)?.response?.data?.message;
  if (typeof message === 'string' && message) return message;
  return 'Could not delete your account. Please try again.';
}

// Confirmation dialog for deleting the logged-in user's account. Password accounts are deleted right
// away; Google-only accounts (hasPassword false) are sent an email link to confirm instead.
export default function DeleteAccountDialog({ hasPassword, onClose }: { hasPassword: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Focus the first field when the dialog opens (and the Close button once the email has been sent).
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('input, button')?.focus();
  }, [emailSentTo]);

  // Escape closes; Tab and Shift+Tab stay inside the dialog.
  useEffect(() => {
    const dialog = dialogRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('input, button:not(:disabled), a[href]')];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, submitting]);

  const canSubmit = confirm === CONFIRM_TEXT && (!hasPassword || password !== '') && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.delete<{ deleted?: boolean; emailSent?: boolean; email?: string }>('/users/me', {
        data: { confirm, ...(hasPassword ? { password } : {}) },
      });
      if (res.data?.deleted) {
        // Only after the server confirms. AccountDeletedNotice logs out once the home page is showing: logging
        // out here would re-render this protected page first and bounce to /login.
        navigate('/', { replace: true, state: { accountDeleted: true } });
        return;
      }
      if (res.data?.emailSent) {
        setEmailSentTo(res.data.email ?? 'your email address');
        return;
      }
      setError('Could not delete your account. Please try again.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-[10px] border border-border bg-bg px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 px-4" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        className="w-full max-w-[460px] rounded-2xl border border-border bg-surface p-[26px] shadow-xl"
      >
        <h2 id="delete-account-title" className="font-serif text-[24px] font-semibold text-ink">
          {emailSentTo ? 'Check your email to confirm' : 'Delete your account?'}
        </h2>

        {emailSentTo ? (
          <>
            <p id="delete-account-description" className="mt-3 text-[15px] leading-[1.6] text-ink-muted">
              We sent a confirmation link to <span className="font-semibold text-ink">{emailSentTo}</span>. Open it
              within 30 minutes and press the button there to finish deleting your account.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border-strong px-5 py-2.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p id="delete-account-description" className="mt-3 text-[15px] leading-[1.6] text-ink-muted">
              This permanently deletes your profile, your requests, and every match you're in, including the
              messages. The people you're matched with will be told, and any request you claimed opens up again.
              This can't be undone.
            </p>

            {hasPassword ? (
              <>
                <label htmlFor="delete-password" className="mb-[7px] mt-5 block text-[13px] font-semibold text-ink-muted">
                  Your password
                </label>
                <input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </>
            ) : (
              <p className="mt-4 text-[14px] text-ink-muted">
                You sign in with Google, so we'll email you a link to confirm.
              </p>
            )}

            <label htmlFor="delete-confirm" className="mb-[7px] mt-[18px] block text-[13px] font-semibold text-ink-muted">
              Type {CONFIRM_TEXT} to confirm
            </label>
            <input
              id="delete-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={inputClass}
            />

            {error && (
              <p role="alert" className="mt-4 text-[13.5px] text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-full border border-border-strong px-5 py-2.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-full border border-red-700 bg-red-700 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:border-red-800 hover:bg-red-800 disabled:opacity-50"
              >
                {submitting ? 'Deleting…' : hasPassword ? 'Delete my account' : 'Email me a confirmation link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
