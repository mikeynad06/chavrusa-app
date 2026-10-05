import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import RequestCard from '../components/RequestCard';
import AlertsPrompt from '../components/AlertsPrompt';
import RequestFilters, {
  EMPTY_FILTERS,
  filterRequests,
  hasActiveFilters,
  type FilterState,
} from '../components/RequestFilters';
import { useAuth } from '../context/AuthContext';
import type { StudyRequest } from '../types/request';
import { isStudyRequest, listOf } from '../lib/shape';

interface ApiError {
  response?: { data?: { message?: string | string[] } };
}

function extractErrorMessage(err: unknown): string {
  const message = (err as ApiError)?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? 'Could not claim this request.';
  return message ?? 'Could not claim this request.';
}

export default function Dashboard() {
  const [requests, setRequests] = useState<StudyRequest[] | null>(null);
  const [error, setError] = useState(false);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});
  const { userId } = useAuth();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  // Typing stays responsive; the list re-filters as soon as React has a moment.
  const deferredFilters = useDeferredValue(filters);
  const visible = useMemo(
    () => (requests ? filterRequests(requests, deferredFilters) : []),
    [requests, deferredFilters],
  );
  const filtering = hasActiveFilters(filters);

  useEffect(() => {
    api
      .get<StudyRequest[]>('/requests')
      .then((res) => {
        const list = listOf(res.data, isStudyRequest, 'requests');
        if (list) setRequests(list);
        else setError(true);
      })
      .catch(() => setError(true));
  }, []);

  const handleClaim = async (requestId: string) => {
    setClaimingId(requestId);
    setClaimErrors((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });

    try {
      await api.post(`/matches/claim/${requestId}`);
      setClaimedIds((prev) => new Set(prev).add(requestId));
    } catch (err) {
      setClaimErrors((prev) => ({ ...prev, [requestId]: extractErrorMessage(err) }));
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] px-6 pb-[84px] pt-10">
      <AlertsPrompt />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[clamp(28px,3.4vw,38px)] font-semibold text-ink">
            Open requests
          </h1>
          <p className="mt-1.5 text-[15.5px] text-ink-muted" aria-live="polite">
            {!requests
              ? error
                ? ''
                : 'Loading…'
              : filtering
                ? `${visible.length} of ${requests.length} ${requests.length === 1 ? 'request' : 'requests'}`
                : `${requests.length} waiting for a chavrusa`}
          </p>
        </div>
        <Link
          to="/requests/new"
          className="rounded-full bg-brass px-6 py-[13px] text-[15px] font-semibold text-surface transition-colors hover:bg-brass-dark"
        >
          Post a request
        </Link>
      </div>

      {error && (
        <p className="mt-10 text-[15px] text-ink-muted">
          Couldn't load open requests. Try refreshing the page.
        </p>
      )}

      {!error && requests && requests.length === 0 && (
        <p className="mt-10 text-[15px] text-ink-muted">No open requests right now.</p>
      )}

      {requests && requests.length > 0 && (
        <RequestFilters requests={requests} filters={filters} onChange={setFilters} />
      )}

      {requests && requests.length > 0 && visible.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
          <p className="font-serif text-[22px] font-semibold text-ink">No requests match those filters.</p>
          <p className="mx-auto mt-2 max-w-[420px] text-[15px] text-ink-muted">
            Try a broader search, or post your own request so someone looking for the same thing can find you.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="rounded-full border border-border-strong px-5 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-alt"
            >
              Clear filters
            </button>
            <Link
              to="/requests/new"
              className="rounded-full bg-brass px-5 py-2.5 text-[14px] font-semibold text-surface transition-colors hover:bg-brass-dark"
            >
              Post a request
            </Link>
          </div>
        </div>
      )}

      {visible.length > 0 && (
        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-[18px]">
          {visible.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              currentUserId={userId}
              isClaimed={claimedIds.has(request.id)}
              isClaiming={claimingId === request.id}
              error={claimErrors[request.id]}
              onClaim={() => handleClaim(request.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
