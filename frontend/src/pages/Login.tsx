import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { PlatformStats } from '../types/stats';

function formatAvgClaim(days: number | null): string {
  if (days === null) return '—';
  const rounded = Math.round(days);
  if (rounded < 1) return '<1 day';
  return `${rounded} ${rounded === 1 ? 'day' : 'days'}`;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    api
      .get<PlatformStats>('/stats')
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.access_token);
      navigate('/dashboard');
    } catch {
      setError('Login failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-svh grid-cols-[repeat(auto-fit,minmax(340px,1fr))]">
      <div className="flex flex-col justify-center bg-bg px-10 py-16">
        <div className="mx-auto w-full max-w-[400px]">
          <span className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-brass-dark">
            Welcome back
          </span>
          <h1 className="mt-3 mb-1.5 font-serif text-[38px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
            Log in
          </h1>
          <p dir="rtl" className="mb-[30px] font-hebrew text-[19px] text-brass">
            כניסה לחשבון
          </p>

          <form onSubmit={handleLogin}>
            <label className="mb-[7px] block text-[13px] font-semibold text-ink-muted">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mb-[18px] w-full rounded-[10px] border border-border bg-surface px-[15px] py-[13px] text-[15px] text-ink focus:border-border-strong focus:outline-none"
            />

            <div className="mb-[7px] flex items-baseline justify-between gap-3">
              <label className="text-[13px] font-semibold text-ink-muted">Password</label>
              <Link to="/forgot-password" className="text-[12.5px] text-brass-dark hover:text-ink hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative mb-5">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

            {error && <p className="mb-4 text-[13.5px] text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full border border-ink bg-ink py-[15px] text-[15.5px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass disabled:opacity-60"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-brass-light">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-full border border-border-strong bg-surface py-[13px] text-[15px] font-semibold text-ink opacity-60"
            >
              Continue with Google
            </button>
          </div>

          <p className="mt-[26px] text-[14px] text-ink-muted">
            New here?{' '}
            <Link to="/register" className="font-semibold text-brass-dark hover:text-ink hover:underline">
              Create an account
            </Link>{' '}
            — takes a minute.
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

        <div className="flex flex-wrap gap-[26px]">
          <div>
            <p className="font-serif text-[26px] text-surface">
              {stats ? stats.pairsMade.toLocaleString() : '—'}
            </p>
            <p className="mt-1 text-[13px] text-brass-light">pairs made</p>
          </div>
          <div>
            <p className="font-serif text-[26px] text-surface">
              {stats ? formatAvgClaim(stats.avgClaimDays) : '—'}
            </p>
            <p className="mt-1 text-[13px] text-brass-light">average to a claim</p>
          </div>
          <div>
            <p className="font-serif text-[26px] text-surface">Free</p>
            <p className="mt-1 text-[13px] text-brass-light">and staying that way</p>
          </div>
        </div>
      </div>
    </div>
  );
}
