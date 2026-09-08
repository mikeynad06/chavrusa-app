import type { StudyRequest } from '../types/request';
import { humanizeEnum, initials } from '../lib/format';

interface RequestCardProps {
  request: StudyRequest;
  currentUserId: string | null;
  isClaimed: boolean;
  isClaiming: boolean;
  error?: string;
  onClaim: () => void;
}

export default function RequestCard({
  request,
  currentUserId,
  isClaimed,
  isClaiming,
  error,
  onClaim,
}: RequestCardProps) {
  const title = request.seferOrTopic || humanizeEnum(request.topic);
  const where = request.location ? humanizeEnum(request.location) : humanizeEnum(request.modality);
  const isOwn = currentUserId !== null && request.requesterId === currentUserId;

  const tags = [
    humanizeEnum(request.level),
    humanizeEnum(request.timeSlot),
    where,
    humanizeEnum(request.language),
  ];

  return (
    <div
      className={
        isClaimed
          ? 'flex flex-col rounded-2xl border border-border-strong bg-surface-sunken p-[22px] transition-shadow duration-200'
          : 'flex flex-col rounded-2xl border border-border bg-surface p-[22px] transition-shadow duration-200 hover:shadow-md'
      }
      style={isClaimed ? undefined : { boxShadow: '0 1px 2px rgba(28,25,23,0.04)' }}
    >
      <h3 className="font-serif text-[21px] font-semibold text-ink">{title}</h3>

      <p className="mt-3 text-[14.5px] leading-[1.55] text-ink-muted">{request.description}</p>

      <div className="mt-3.5 flex flex-wrap gap-[7px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-surface-sunken px-2.5 py-[5px] text-[12.5px] text-brass-dark"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-surface-alt pt-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-alt text-[12.5px] font-semibold text-brass-dark">
            {initials(request.requester.name)}
          </span>
          <span className="text-[13.5px] text-ink-2">{request.requester.name}</span>
        </div>

        {isClaimed ? (
          <button
            type="button"
            disabled
            className="rounded-full border border-border-strong bg-transparent px-[18px] py-[9px] text-[14px] font-semibold text-brass-dark"
          >
            Claimed by you
          </button>
        ) : isOwn ? (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full border border-border-strong bg-transparent px-[18px] py-[9px] text-[14px] font-semibold text-ink-muted"
          >
            Your request
          </button>
        ) : (
          <button
            type="button"
            onClick={onClaim}
            disabled={isClaiming}
            className="rounded-full border border-ink bg-ink px-[18px] py-[9px] text-[14px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass disabled:opacity-60"
          >
            {isClaiming ? 'Claiming…' : 'Claim'}
          </button>
        )}
      </div>

      {error && <p className="mt-2.5 text-right text-[12.5px] text-red-700">{error}</p>}
    </div>
  );
}
