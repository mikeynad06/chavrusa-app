import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { humanizeEnum } from '../lib/format';
import type { Location, Timezone } from '../types/request';

interface ApiError {
  response?: { status?: number; data?: { message?: string | string[] } };
}

function extractErrorMessage(err: unknown): string {
  const apiErr = err as ApiError;
  if (apiErr?.response?.status === 409) return 'An account with this email already exists.';
  const message = apiErr?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? 'Could not create your account.';
  return message ?? 'Could not create your account.';
}

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

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState<Location | ''>('');
  const [timezone, setTimezone] = useState<Timezone | ''>('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!location || !timezone) {
      setError('Please select your location and timezone.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/register', {
        name,
        email,
        password,
        location,
        timezone,
        whatsappNumber: whatsappNumber || undefined,
      });
      const loginRes = await api.post('/auth/login', { email, password });
      login(loginRes.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-svh grid-cols-[repeat(auto-fit,minmax(340px,1fr))]">
      <div className="flex flex-col justify-center bg-bg px-10 py-16">
        <div className="mx-auto w-full max-w-[400px]">
          <span className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-brass-dark">
            Join the beis medrash
          </span>
          <h1 className="mt-3 mb-1.5 font-serif text-[38px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
            Create an account
          </h1>
          <p dir="rtl" className="mb-[30px] font-hebrew text-[19px] text-brass">
            הרשמה
          </p>

          <form onSubmit={handleRegister}>
            <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mb-[18px] w-full rounded-[10px] border border-border bg-surface px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
            />

            <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mb-[18px] w-full rounded-[10px] border border-border bg-surface px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
            />

            <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">Password</label>
            <div className="relative mb-[18px]">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-[10px] border border-border bg-surface px-[15px] py-[13px] pr-11 text-[15px] text-ink focus:border-border-strong focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink-muted hover:text-ink"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <div className="mb-[18px] grid grid-cols-2 gap-3">
              <div>
                <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">Location</label>
                <div className="relative">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value as Location)}
                    required
                    className="w-full appearance-none rounded-[10px] border border-border bg-surface px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {humanizeEnum(loc)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-brass-light"
                  />
                </div>
              </div>
              <div>
                <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">Timezone</label>
                <div className="relative">
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value as Timezone)}
                    required
                    className="w-full appearance-none rounded-[10px] border border-border bg-surface px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {(Object.keys(TIMEZONE_LABELS) as Timezone[]).map((tz) => (
                      <option key={tz} value={tz}>
                        {TIMEZONE_LABELS[tz]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-brass-light"
                  />
                </div>
              </div>
            </div>

            <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">
              WhatsApp number <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+1 555 000 0000"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="mb-5 w-full rounded-[10px] border border-border bg-surface px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
            />

            {error && <p className="mb-4 text-[13.5px] text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full border border-ink bg-ink py-[15px] text-[15.5px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-[26px] text-[14px] text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brass-dark hover:text-ink hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-7 bg-ink px-10 py-16 text-on-dark">
        <div>
          <p dir="rtl" className="font-hebrew text-[26px] leading-[1.4] text-surface">
            שְׁנַיִם שֶׁיּוֹשְׁבִין וְיֵשׁ בֵּינֵיהֶם דִּבְרֵי תוֹרָה, שְׁכִינָה שְׁרוּיָה בֵּינֵיהֶם
          </p>
          <p className="mt-3 font-serif text-[19px] italic leading-[1.5] text-[#e8dfcc]">
            "When two sit together and words of Torah pass between them, the Divine Presence rests between them."
          </p>
          <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brass-light">
            Pirkei Avos 3:2
          </p>
        </div>

        <div
          className="flex h-[200px] items-end rounded-2xl border border-[rgba(232,223,204,0.2)] p-3.5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, rgba(232,223,204,0.06) 0 10px, transparent 10px 20px)',
          }}
        >
          <span className="font-mono text-[11.5px] text-brass-light">
            photo: beis medrash at night
          </span>
        </div>
      </div>
    </div>
  );
}
