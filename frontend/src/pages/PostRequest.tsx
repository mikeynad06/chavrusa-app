import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import api from '../services/api';
import { humanizeEnum } from '../lib/format';
import type {
  Topic,
  LearningStyle,
  LearningLevel,
  LearningModality,
  Language,
  Location,
  TimeSlot,
  Timezone,
} from '../types/request';

const DRAFT_KEY = 'chavrusa:post-request-draft';

const TOPIC_OPTIONS: Topic[] = [
  'GEMARA',
  'HALACHA',
  'TANACH',
  'MACHSHAVA',
  'MUSSAR',
  'CHASSIDUT',
  'MISHNAH',
  'PARSHA',
  'MIDRASH',
  'OTHER',
];

const STYLE_OPTIONS: LearningStyle[] = [
  'IYUN',
  'BEKIYUT',
  'DISCUSSION',
  'SHIUR_REVIEW',
  'TEXT_FOCUSED',
  'FLEXIBLE',
];

const LEVEL_OPTIONS: { label: string; value: LearningLevel }[] = [
  { label: 'Beginner', value: 'BEGINNER' },
  { label: 'Intermediate', value: 'INTERMEDIATE' },
  { label: 'Advanced', value: 'ADVANCED' },
  { label: 'I want to teach', value: 'ANY' },
];

const LANGUAGE_OPTIONS: Language[] = ['ENGLISH', 'HEBREW', 'EITHER'];

const TIME_SLOT_OPTIONS: { label: string; value: TimeSlot }[] = [
  { label: 'Early morning', value: 'MORNING' },
  { label: 'Midday', value: 'AFTERNOON' },
  { label: 'Nights', value: 'NIGHT' },
  { label: 'Flexible', value: 'FLEXIBLE' },
];

const MODALITY_OPTIONS: { label: string; sub: string; value: LearningModality }[] = [
  { label: 'In person', sub: 'Meet somewhere local', value: 'IN_PERSON' },
  { label: 'Online / phone', sub: 'Anywhere in the world', value: 'ONLINE' },
  { label: 'Either', sub: 'Whatever works', value: 'EITHER' },
];

const LOCATION_OPTIONS: Location[] = [
  'JERUSALEM',
  'TEL_AVIV',
  'RAMAT_BEIT_SHEMESH',
  'TEANECK',
  'NEW_YORK',
  'LONDON',
  'OTHER',
];

const TIMEZONE_LABELS: Record<Timezone, string> = {
  ISRAEL: 'Israel',
  EST: 'EST',
  PST: 'PST',
  GMT: 'GMT',
};

interface DraftState {
  seferOrTopic: string;
  topic: Topic | '';
  level: LearningLevel | '';
  style: LearningStyle | '';
  language: Language | '';
  timeSlot: TimeSlot | '';
  timezone: Timezone | '';
  modality: LearningModality | '';
  location: Location | '';
  description: string;
}

const EMPTY_DRAFT: DraftState = {
  seferOrTopic: '',
  topic: '',
  level: '',
  style: '',
  language: '',
  timeSlot: '',
  timezone: '',
  modality: '',
  location: '',
  description: '',
};

function loadDraft(): DraftState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DRAFT;
  }
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-[10px] border border-border bg-bg px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-brass-light"
      />
    </div>
  );
}

export default function PostRequest() {
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [error, setError] = useState('');
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setDraft(loadDraft());
  }, []);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftSavedAt(Date.now());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!draft.topic || !draft.level || !draft.style || !draft.timeSlot || !draft.timezone || !draft.description.trim()) {
      setError('Please fill in topic, level, style, when you\'re free, your timezone, and a description.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/requests', {
        topic: draft.topic,
        seferOrTopic: draft.seferOrTopic || undefined,
        style: draft.style,
        level: draft.level,
        modality: draft.modality || undefined,
        language: draft.language || undefined,
        description: draft.description,
        location: draft.modality !== 'ONLINE' && draft.location ? draft.location : undefined,
        timeSlot: draft.timeSlot,
        timezone: draft.timezone,
      });
      localStorage.removeItem(DRAFT_KEY);
      navigate('/dashboard');
    } catch {
      setError('Could not post your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const previewTitle = draft.seferOrTopic || (draft.topic ? humanizeEnum(draft.topic) : 'Your request title');
  const previewTags = [draft.level, draft.timeSlot, draft.location || draft.modality, draft.language]
    .filter((v) => v !== '')
    .map((v) => humanizeEnum(v));

  return (
    <div className="mx-auto max-w-[1080px] px-6 pb-[72px] pt-10">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-8">
        <form
          onSubmit={handleSubmit}
          className="col-span-2 min-w-0 rounded-[20px] border border-border bg-surface p-8"
        >
          <span className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-brass-dark">
            Step 1 of 1
          </span>
          <h1 className="mt-2.5 mb-1 font-serif text-[34px] font-semibold tracking-[-0.02em] text-ink">
            Post a request
          </h1>
          <p className="mb-7 text-[15.5px] text-ink-muted">
            Say what you want to learn. Someone claims it, and we hand over your details.
          </p>

          <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">Topic</label>
          <Select value={draft.topic} onChange={(v) => set('topic', v as Topic)}>
            <option value="" disabled>
              Select a topic
            </option>
            {TOPIC_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {humanizeEnum(t)}
              </option>
            ))}
          </Select>

          <label className="mt-[22px] mb-[7px] block text-[13px] font-semibold text-ink-muted">
            What do you want to learn?
          </label>
          <input
            value={draft.seferOrTopic}
            onChange={(e) => set('seferOrTopic', e.target.value)}
            placeholder="Bava Metzia — second perek"
            className="w-full rounded-[10px] border border-border-strong bg-bg px-[15px] py-[13px] text-[15.5px] text-ink focus:border-ink focus:outline-none"
          />
          <p className="mb-[22px] mt-2 font-mono text-[11.5px] text-brass">
            A masechta, a sefer, or just "something in mussar"
          </p>

          <label className="mb-2.5 block text-[13px] font-semibold text-ink-muted">Level</label>
          <div className="mb-[22px] flex flex-wrap gap-2">
            {LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('level', opt.value)}
                className={
                  draft.level === opt.value
                    ? 'rounded-full bg-ink px-[15px] py-2.5 text-[13.5px] font-semibold text-surface'
                    : 'rounded-full border border-border bg-bg px-[15px] py-2.5 text-[13.5px] text-ink-muted'
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[18px]">
            <div>
              <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">Style</label>
              <Select value={draft.style} onChange={(v) => set('style', v as LearningStyle)}>
                <option value="" disabled>
                  Select a style
                </option>
                {STYLE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {humanizeEnum(s)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">Language</label>
              <Select value={draft.language} onChange={(v) => set('language', v as Language)}>
                <option value="">No preference</option>
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {humanizeEnum(l)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <label className="mb-2.5 block text-[13px] font-semibold text-ink-muted">
            When are you free?
          </label>
          <div className="mb-[22px] flex flex-wrap gap-2">
            {TIME_SLOT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('timeSlot', opt.value)}
                className={
                  draft.timeSlot === opt.value
                    ? 'rounded-full bg-brass px-3.5 py-2 text-[13px] font-semibold text-surface'
                    : 'rounded-full border border-border bg-bg px-3.5 py-2 text-[13px] text-ink-muted'
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">
            Your timezone
          </label>
          <div className="mb-[22px] max-w-[220px]">
            <Select value={draft.timezone} onChange={(v) => set('timezone', v as Timezone)}>
              <option value="" disabled>
                Select a timezone
              </option>
              {(Object.keys(TIMEZONE_LABELS) as Timezone[]).map((tz) => (
                <option key={tz} value={tz}>
                  {TIMEZONE_LABELS[tz]}
                </option>
              ))}
            </Select>
          </div>

          <label className="mb-2.5 block text-[13px] font-semibold text-ink-muted">Where</label>
          <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
            {MODALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('modality', opt.value)}
                className={
                  draft.modality === opt.value
                    ? 'rounded-xl border border-ink bg-surface-sunken p-3.5 text-left'
                    : 'rounded-xl border border-border bg-bg p-3.5 text-left'
                }
              >
                <p className="text-[14.5px] font-semibold text-ink">{opt.label}</p>
                <p className="mt-1 text-[12.5px] text-ink-muted">{opt.sub}</p>
              </button>
            ))}
          </div>

          {draft.modality !== 'ONLINE' && (
            <div className="mb-[22px] max-w-[300px]">
              <Select value={draft.location} onChange={(v) => set('location', v as Location)}>
                <option value="">No specific location</option>
                {LOCATION_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {humanizeEnum(loc)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">
            Anything else?
          </label>
          <textarea
            rows={3}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Learned it once before — want to go slower this time."
            className="w-full resize-y rounded-[10px] border border-border bg-bg px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
          />

          {error && <p className="mt-4 text-[13.5px] text-red-700">{error}</p>}

          <div className="mt-[26px] flex flex-wrap items-center gap-3 border-t border-surface-alt pt-[22px]">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full border border-brass bg-brass px-7 py-3.5 text-[15.5px] font-semibold text-surface transition-colors hover:border-brass-dark hover:bg-brass-dark disabled:opacity-60"
            >
              {submitting ? 'Posting…' : 'Post request'}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-full border border-border-strong bg-transparent px-[22px] py-3.5 text-[15px] font-semibold text-ink hover:bg-surface-sunken"
            >
              Save draft
            </button>
            {draftSavedAt && (
              <span className="font-mono text-[11.5px] text-brass">Draft saved</span>
            )}
          </div>
        </form>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface p-[22px]">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.1em] text-brass">
              Live preview
            </p>
            <div className="flex items-start justify-between gap-2.5">
              <h3 className="min-w-0 font-serif text-[20px] font-semibold text-ink">
                {previewTitle}
              </h3>
              <span className="whitespace-nowrap rounded-full border border-border bg-surface-alt px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-brass-dark">
                New
              </span>
            </div>
            <p className="mt-3 text-[14.5px] leading-[1.55] text-ink-muted">
              {draft.description || 'Say what you\'re looking for above.'}
            </p>
            {previewTags.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-[7px]">
                {previewTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-surface-sunken px-2.5 py-[5px] text-[12.5px] text-brass-dark"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface-sunken p-[22px]">
            <h4 className="mb-2.5 font-serif text-[18px] font-semibold text-ink">
              What makes a request get claimed
            </h4>
            <ul className="list-disc space-y-1 pl-[18px] text-[14px] leading-[1.65] text-ink-muted">
              <li>Name a specific sefer or perek</li>
              <li>Give two or three real time slots</li>
              <li>Say if you're fine learning by phone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
