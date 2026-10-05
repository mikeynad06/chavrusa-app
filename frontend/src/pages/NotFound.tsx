import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Page not found — Chavrusa';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[720px] px-6 pb-[84px] pt-16 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-brass-dark">404</span>
      <h1 className="mt-3 font-serif text-[clamp(30px,3.8vw,44px)] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
        We couldn't find that page.
      </h1>
      <p dir="rtl" lang="he" className="mt-3 font-hebrew text-[20px] text-brass">
        הַדַּף לֹא נִמְצָא
      </p>
      <p className="mx-auto mt-5 max-w-[460px] text-[16.5px] leading-[1.7] text-ink-muted">
        The link may be old, or the address may have a typo. The open requests and everything
        else are still where you left them.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-full border border-ink bg-ink px-7 py-[13px] text-[15px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass"
        >
          Go home
        </Link>
        <Link
          to="/dashboard"
          className="rounded-full border border-border-strong px-7 py-[13px] text-[15px] font-semibold text-ink transition-colors hover:bg-surface-alt"
        >
          Browse requests
        </Link>
      </div>
    </div>
  );
}
