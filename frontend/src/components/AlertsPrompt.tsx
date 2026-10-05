import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, X } from 'lucide-react';
import api from '../services/api';
import type { UserProfile } from '../types/profile';

const DISMISSED_KEY = 'alertsPromptDismissedAt';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

// localStorage can throw (private mode, blocked site data), so every access is guarded.
function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Not persisted; the prompt just comes back next visit.
  }
}

// Nudges users with no topic or no location subscription, since they won't get any new-request alerts.
export default function AlertsPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (dismissedRecently()) return;
    let cancelled = false;
    api
      .get<UserProfile>('/users/me')
      .then((res) => {
        const { preferredTopics, subscribedLocations } = res.data;
        if (!cancelled && (preferredTopics.length === 0 || subscribedLocations.length === 0)) setShow(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    rememberDismissal();
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label="Set up alerts"
      className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-border border-l-4 border-l-brass bg-surface px-5 py-4"
    >
      <BellRing size={20} className="shrink-0 text-brass" aria-hidden="true" />
      <p className="min-w-[220px] flex-1 text-[15px] leading-[1.5] text-ink">
        Get notified when someone posts what you want to learn. Add topics and a location in your profile.
      </p>
      <div className="flex items-center gap-2">
        <Link
          to="/profile#notify"
          className="rounded-full bg-brass px-5 py-2.5 text-[14px] font-semibold text-surface transition-colors hover:bg-brass-dark"
        >
          Set up alerts
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
