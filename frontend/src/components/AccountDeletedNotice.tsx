import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Shown on arrival after a confirmed account deletion (navigate('/', { state: { accountDeleted: true } })).
// It also signs out: doing that here, once the public page is showing, avoids the protected page that
// started the deletion re-rendering first and bouncing to /login.
export default function AccountDeletedNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [show, setShow] = useState(false);
  const arrivedFromDeletion = (location.state as { accountDeleted?: boolean } | null)?.accountDeleted === true;

  useEffect(() => {
    if (!arrivedFromDeletion) return;
    setShow(true);
    logout();
    // Drop the flag from history so a refresh or Back doesn't show the notice again.
    navigate(location.pathname + location.search, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivedFromDeletion]);

  if (!show) return null;

  return (
    <div role="status" className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-6 py-3 text-[14.5px] text-ink">
        <p>
          <span className="font-semibold">Your account has been deleted.</span>{' '}
          <span className="text-ink-muted">Thank you for learning with us.</span>
        </p>
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Dismiss"
          className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
