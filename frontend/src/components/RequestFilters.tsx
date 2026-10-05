import { ChevronDown, Search } from 'lucide-react';
import { humanizeEnum } from '../lib/format';
import type { Location, StudyRequest, Topic } from '../types/request';

export type WhereFilter = '' | 'IN_PERSON' | 'ONLINE';

export interface FilterState {
  query: string;
  topic: Topic | '';
  location: Location | '';
  where: WhereFilter;
}

export const EMPTY_FILTERS: FilterState = { query: '', topic: '', location: '', where: '' };

export function hasActiveFilters(f: FilterState): boolean {
  return f.query.trim() !== '' || f.topic !== '' || f.location !== '' || f.where !== '';
}

export function filterRequests(requests: StudyRequest[], f: FilterState): StudyRequest[] {
  const terms = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return requests.filter((r) => {
    if (f.topic && r.topic !== f.topic) return false;
    if (f.location && r.location !== f.location) return false;
    // "Either" requests are open to both, so they match both the in-person and online filters.
    if (f.where && r.modality !== f.where && r.modality !== 'EITHER') return false;
    if (terms.length === 0) return true;
    const haystack = [r.seferOrTopic ?? '', humanizeEnum(r.topic), r.description ?? ''].join(' ').toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

// Only offer values that actually appear in the loaded requests, so a filter never leads to a guaranteed-empty list.
function presentValues<T extends string>(values: (T | null)[]): T[] {
  return [...new Set(values.filter((v): v is T => v !== null))].sort((a, b) =>
    humanizeEnum(a).localeCompare(humanizeEnum(b)),
  );
}

const selectClass =
  'w-full appearance-none rounded-[10px] border border-border bg-surface py-[11px] pl-[13px] pr-9 text-[14.5px] text-ink focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/30';

function FilterSelect<T extends string>({
  id,
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  id: string;
  label: string;
  value: T | '';
  onChange: (value: T | '') => void;
  allLabel: string;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="min-w-[150px] flex-1">
      <label htmlFor={id} className="mb-[6px] block text-[12.5px] font-semibold text-ink-muted">
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value as T | '')} className={selectClass}>
          <option value="">{allLabel}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brass-light"
        />
      </div>
    </div>
  );
}

export default function RequestFilters({
  requests,
  filters,
  onChange,
}: {
  requests: StudyRequest[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) => onChange({ ...filters, [key]: value });
  const topics = presentValues(requests.map((r) => r.topic));
  const locations = presentValues(requests.map((r) => r.location));

  return (
    <section role="search" className="mt-8 rounded-2xl border border-border bg-surface-sunken p-4 sm:p-5" aria-label="Filter requests">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-[2_1_260px]">
          <label htmlFor="request-search" className="mb-[6px] block text-[12.5px] font-semibold text-ink-muted">
            Search
          </label>
          <div className="relative">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brass-light"
            />
            <input
              id="request-search"
              type="search"
              value={filters.query}
              onChange={(e) => set('query', e.target.value)}
              placeholder="Sefer, topic, or anything in the description"
              autoComplete="off"
              className="w-full rounded-[10px] border border-border bg-surface py-[11px] pl-10 pr-[13px] text-[14.5px] text-ink placeholder:text-ink-muted/70 focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/30"
            />
          </div>
        </div>
        <FilterSelect
          id="filter-topic"
          label="Topic"
          value={filters.topic}
          onChange={(v) => set('topic', v)}
          allLabel="All topics"
          options={topics.map((t) => ({ value: t, label: humanizeEnum(t) }))}
        />
        <FilterSelect
          id="filter-location"
          label="Location"
          value={filters.location}
          onChange={(v) => set('location', v)}
          allLabel="All locations"
          options={locations.map((l) => ({ value: l, label: humanizeEnum(l) }))}
        />
        <FilterSelect<'IN_PERSON' | 'ONLINE'>
          id="filter-where"
          label="Where"
          value={filters.where}
          onChange={(v) => set('where', v)}
          allLabel="Anywhere"
          options={[
            { value: 'IN_PERSON', label: 'In person' },
            { value: 'ONLINE', label: 'Online' },
          ]}
        />
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="rounded-full border border-border-strong bg-surface px-4 py-[11px] text-[14px] font-semibold text-ink transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}
