import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import api from '../services/api';
import { humanizeEnum } from '../lib/format';
import type { UserProfile } from '../types/profile';
import { isUserProfile } from '../lib/shape';
import DeleteAccountDialog from '../components/DeleteAccountDialog';
import type { Topic, Location } from '../types/request';

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

const LOCATION_OPTIONS: Location[] = [
  'JERUSALEM',
  'TEL_AVIV',
  'RAMAT_BEIT_SHEMESH',
  'TEANECK',
  'NEW_YORK',
  'LONDON',
  'OTHER',
];

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-surface-sunken text-brass-dark',
  MATCHED: 'bg-ink text-bg',
  CLOSED: 'bg-surface-alt text-ink-muted',
  EXPIRED: 'bg-surface-alt text-ink-muted',
};

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSavedAt, setInfoSavedAt] = useState<number | null>(null);
  const [newTopic, setNewTopic] = useState<Topic | ''>('');
  const [newLocation, setNewLocation] = useState<Location | ''>('');
  const [canceling, setCanceling] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const { hash } = useLocation();
  const highlightNotify = hash === '#notify';

  const load = () => {
    api
      .get<UserProfile>('/users/me')
      .then((res) => {
        if (!isUserProfile(res.data)) {
          console.error('[api] Unexpected /users/me response:', res.data);
          setLoadFailed(true);
          return;
        }
        setLoadFailed(false);
        setProfile(res.data);
        setName(res.data.name);
        setWhatsappNumber(res.data.whatsappNumber ?? '');
      })
      .catch(() => setLoadFailed(true));
  };

  useEffect(load, []);

  // Arriving from the Dashboard alerts prompt: the section only exists once the profile has loaded,
  // so the browser's own #hash scroll can't find it -- scroll to it ourselves.
  const profileLoaded = profile !== null;
  useEffect(() => {
    if (highlightNotify && profileLoaded) {
      document.getElementById('notify')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlightNotify, profileLoaded]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      await api.patch('/users/me', { name, whatsappNumber: whatsappNumber || undefined });
      setInfoSavedAt(Date.now());
      load();
    } finally {
      setSavingInfo(false);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopic) return;
    await api.post('/users/me/topics', { topic: newTopic });
    setNewTopic('');
    load();
  };

  const handleRemoveTopic = async (topic: Topic) => {
    await api.delete(`/users/me/topics/${topic}`);
    load();
  };

  const handleAddLocation = async () => {
    if (!newLocation) return;
    await api.post('/users/me/locations', { location: newLocation });
    setNewLocation('');
    load();
  };

  const handleRemoveLocation = async (id: string) => {
    await api.delete(`/users/me/locations/${id}`);
    load();
  };

  const handleCancelRequest = async (id: string) => {
    setError('');
    setCanceling(id);
    try {
      await api.patch(`/requests/${id}/cancel`);
      load();
    } catch {
      setError('Could not cancel that request.');
    } finally {
      setCanceling(null);
    }
  };

  if (!profile) {
    return (
      <div className="mx-auto max-w-[760px] px-6 py-16 text-[15px] text-ink-muted">
        {loadFailed ? "Couldn't load your profile. Try refreshing the page." : 'Loading…'}
      </div>
    );
  }

  const subscribedTopicValues = new Set(profile.preferredTopics.map((t) => t.topic));
  const availableTopics = TOPIC_OPTIONS.filter((t) => !subscribedTopicValues.has(t));

  const subscribedLocationValues = new Set(profile.subscribedLocations.map((l) => l.location));
  const availableLocations = LOCATION_OPTIONS.filter((l) => !subscribedLocationValues.has(l));

  return (
    <div className="mx-auto max-w-[760px] px-6 pb-[84px] pt-10">
      <h1 className="font-serif text-[clamp(28px,3.4vw,38px)] font-semibold text-ink">Your profile</h1>
      <p className="mt-1.5 text-[15.5px] text-ink-muted">{profile.email}</p>

      <form
        onSubmit={handleSaveInfo}
        className="mt-8 rounded-2xl border border-border bg-surface p-[26px]"
      >
        <h2 className="font-serif text-[20px] font-semibold text-ink">Your info</h2>
        <label htmlFor="profile-name" className="mb-[7px] mt-5 block text-[13px] font-semibold text-ink-muted">Name</label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-[10px] border border-border bg-bg px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
        />
        <label htmlFor="profile-whatsapp" className="mb-[7px] mt-[18px] block text-[13px] font-semibold text-ink-muted">
          WhatsApp number
        </label>
        <input
          id="profile-whatsapp"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="+1 555 000 0000"
          className="w-full rounded-[10px] border border-border bg-bg px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
        />
        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={savingInfo}
            className="rounded-full bg-brass px-6 py-[11px] text-[14px] font-semibold text-surface transition-colors hover:bg-brass-dark disabled:opacity-60"
          >
            {savingInfo ? 'Saving…' : 'Save'}
          </button>
          {infoSavedAt && <span className="font-mono text-[11.5px] text-brass">Saved</span>}
        </div>
      </form>

      <section
        id="notify"
        aria-labelledby="notify-heading"
        className={`mt-6 scroll-mt-28 rounded-2xl border bg-surface p-[26px] ${
          highlightNotify ? 'border-brass ring-2 ring-brass/25' : 'border-border'
        }`}
      >
        <h2 id="notify-heading" className="font-serif text-[20px] font-semibold text-ink">Notify me about</h2>
        <p className="mt-1.5 text-[14px] text-ink-muted">
          You get an email when a new request matches one of your topics and one of your locations.
        </p>

        <p className="mb-2.5 mt-5 text-[13px] font-semibold text-ink-muted">Topics</p>
        <div className="flex flex-wrap gap-2">
          {profile.preferredTopics.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleRemoveTopic(t.topic)}
              aria-label={`Remove ${humanizeEnum(t.topic)} alert`}
              className="rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-bg"
            >
              {humanizeEnum(t.topic)} ×
            </button>
          ))}
          {profile.preferredTopics.length === 0 && (
            <span className="text-[13.5px] text-ink-muted">No topic alerts yet.</span>
          )}
        </div>
        {availableTopics.length > 0 && (
          <div className="mt-3 flex items-center gap-2.5">
            <div className="relative max-w-[220px]">
              <select
                aria-label="Add a topic"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value as Topic)}
                className="w-full appearance-none rounded-[10px] border border-border bg-bg px-[13px] py-2.5 text-[14px] text-ink focus:border-border-strong focus:outline-none"
              >
                <option value="">Add a topic…</option>
                {availableTopics.map((t) => (
                  <option key={t} value={t}>
                    {humanizeEnum(t)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brass-light" />
            </div>
            <button
              type="button"
              onClick={handleAddTopic}
              disabled={!newTopic}
              className="rounded-full border border-border-strong px-4 py-2.5 text-[13.5px] font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}

        <p className="mb-2.5 mt-6 text-[13px] font-semibold text-ink-muted">Locations</p>
        <div className="flex flex-wrap gap-2">
          {profile.subscribedLocations.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => handleRemoveLocation(l.id)}
              aria-label={`Remove ${humanizeEnum(l.location)} alert`}
              className="rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-bg"
            >
              {humanizeEnum(l.location)} ×
            </button>
          ))}
          {profile.subscribedLocations.length === 0 && (
            <span className="text-[13.5px] text-ink-muted">No location alerts yet.</span>
          )}
        </div>
        {availableLocations.length > 0 && (
          <div className="mt-3 flex items-center gap-2.5">
            <div className="relative max-w-[220px]">
              <select
                aria-label="Add a location"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value as Location)}
                className="w-full appearance-none rounded-[10px] border border-border bg-bg px-[13px] py-2.5 text-[14px] text-ink focus:border-border-strong focus:outline-none"
              >
                <option value="">Add a location…</option>
                {availableLocations.map((l) => (
                  <option key={l} value={l}>
                    {humanizeEnum(l)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brass-light" />
            </div>
            <button
              type="button"
              onClick={handleAddLocation}
              disabled={!newLocation}
              className="rounded-full border border-border-strong px-4 py-2.5 text-[13.5px] font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </section>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-[26px]">
        <h2 className="font-serif text-[20px] font-semibold text-ink">Your requests</h2>
        {error && <p role="alert" className="mt-3 text-[13.5px] text-red-700">{error}</p>}
        <div className="mt-4 flex flex-col gap-3">
          {profile.requests.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold text-ink">
                  {r.seferOrTopic || humanizeEnum(r.topic)}
                </p>
                <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${STATUS_STYLES[r.status]}`}>
                  {r.status}
                </span>
              </div>
              {r.status === 'OPEN' && (
                <button
                  type="button"
                  onClick={() => handleCancelRequest(r.id)}
                  disabled={canceling === r.id}
                  className="flex-none rounded-full border border-border-strong px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50"
                >
                  {canceling === r.id ? 'Canceling…' : 'Cancel'}
                </button>
              )}
            </div>
          ))}
          {profile.requests.length === 0 && (
            <p className="text-[14px] text-ink-muted">You haven't posted any requests yet.</p>
          )}
        </div>
      </div>

      <section aria-labelledby="delete-heading" className="mt-6 rounded-2xl border border-red-200 bg-surface p-[26px]">
        <h2 id="delete-heading" className="font-serif text-[20px] font-semibold text-ink">Delete account</h2>
        <p className="mt-1.5 text-[14px] leading-[1.6] text-ink-muted">
          Permanently delete your profile, requests, matches and messages. This can't be undone.
        </p>
        <button
          ref={deleteButtonRef}
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="mt-4 rounded-full border border-red-700 px-5 py-2.5 text-[14px] font-semibold text-red-700 transition-colors hover:bg-red-50"
        >
          Delete account
        </button>
      </section>

      {deleteOpen && (
        <DeleteAccountDialog
          hasPassword={profile.hasPassword !== false}
          onClose={() => {
            setDeleteOpen(false);
            deleteButtonRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
