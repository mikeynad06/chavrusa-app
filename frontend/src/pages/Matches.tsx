import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { humanizeEnum, initials } from '../lib/format';
import type { Match } from '../types/match';

export default function Matches() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState(false);
  const { userId } = useAuth();

  useEffect(() => {
    api
      .get<Match[]>('/matches/mine')
      .then((res) => setMatches(res.data))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="mx-auto max-w-[1180px] px-6 pb-[84px] pt-10">
      <h1 className="font-serif text-[clamp(28px,3.4vw,38px)] font-semibold text-ink">
        Your matches
      </h1>
      <p className="mt-1.5 text-[15.5px] text-ink-muted">
        {matches ? `${matches.length} ${matches.length === 1 ? 'chavrusa' : 'chavrusas'}` : 'Loading…'}
      </p>

      {error && (
        <p className="mt-10 text-[15px] text-ink-muted">
          Couldn't load your matches. Try refreshing the page.
        </p>
      )}

      {!error && matches && matches.length === 0 && (
        <p className="mt-10 text-[15px] text-ink-muted">No matches yet.</p>
      )}

      {matches && matches.length > 0 && (
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]">
          {matches.map((match) => {
            const otherParty =
              match.matchedUserId === userId ? match.request.requester : match.matchedUser;
            const title = match.request.seferOrTopic || humanizeEnum(match.request.topic);

            return (
              <Link
                key={match.id}
                to={`/matches/${match.id}`}
                className="flex flex-col rounded-2xl border border-border bg-surface p-[22px] transition-shadow duration-200 hover:shadow-md"
                style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04)' }}
              >
                <h3 className="font-serif text-[21px] font-semibold text-ink">{title}</h3>
                <p className="mt-3 line-clamp-2 text-[14.5px] leading-[1.55] text-ink-muted">
                  {match.request.description}
                </p>
                <div className="mt-5 flex items-center gap-2.5 border-t border-surface-alt pt-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-alt text-[12.5px] font-semibold text-brass-dark">
                    {initials(otherParty.name)}
                  </span>
                  <span className="text-[13.5px] text-ink-2">{otherParty.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
