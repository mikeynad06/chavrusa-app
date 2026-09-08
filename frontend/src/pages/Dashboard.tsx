import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import RequestCard from '../components/RequestCard';
import { useAuth } from '../context/AuthContext';
import type { StudyRequest } from '../types/request';

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

  useEffect(() => {
    api
      .get<StudyRequest[]>('/requests')
      .then((res) => setRequests(res.data))
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[clamp(28px,3.4vw,38px)] font-semibold text-ink">
            Open requests
          </h1>
          <p className="mt-1.5 text-[15.5px] text-ink-muted">
            {requests ? `${requests.length} waiting for a chavrusa` : 'Loading…'}
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
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]">
          {requests.map((request) => (
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
