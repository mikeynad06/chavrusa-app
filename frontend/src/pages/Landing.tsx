import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Reveal from '../components/Reveal';
import { HASKAMA_QUOTES } from '../data/haskamas';
import type { PlatformStats } from '../types/stats';

const HOW_IT_WORKS = [
  {
    number: '01',
    title: 'Post a request',
    body: "Topic, level, style, when you're free, and whether you want to meet in person or learn over the phone.",
  },
  {
    number: '02',
    title: 'Someone claims it',
    body: 'Anyone browsing can take your request. Subscribers get a note the moment something in their area or interest goes up.',
  },
  {
    number: '03',
    title: 'Start learning',
    body: "You get each other's details and set a first seder. We stay out of the way after that.",
  },
];

const PHOTO_GRID = [
  { caption: 'two learners over an open gemara', big: true },
  { caption: 'hands on a page', big: false },
  { caption: 'shtender, early morning', big: false },
  { caption: 'learning by phone', big: false },
  { caption: 'shelf of sefarim', big: false },
];

const TESTIMONIALS = [
  {
    quote: "I hadn't opened a gemara in eleven years. I posted on a Tuesday and had a chavrusa by Shabbos.",
    attribution: 'Yitzchok M. · Cleveland',
  },
  {
    quote: 'I wanted to give back an hour a week. Someone claimed my request the same night.',
    attribution: "R' Dovid S. · Jerusalem",
  },
  {
    quote: "We learn at 6am over the phone. Two years now, and we've never met in person.",
    attribution: 'Shani R. · Toronto',
  },
];

const STRIPE_BG = 'repeating-linear-gradient(135deg, #f4eee0 0 10px, #faf7f0 10px 20px)';

export default function Landing() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    api
      .get<PlatformStats>('/stats')
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <section
        className="border-b border-border px-6 pb-[88px] pt-24 text-center"
        style={{
          background: 'radial-gradient(120% 90% at 50% 0%, #fffdf8 0%, #faf7f0 60%, #f4eee0 100%)',
        }}
      >
        <div className="mx-auto max-w-[900px]">
          <span className="inline-block rounded-full border border-border bg-surface-sunken px-3.5 py-[7px] font-mono text-xs uppercase tracking-[0.12em] text-brass-dark">
            Learn with someone
            {typeof stats?.pairsMade === 'number'
              ? ` · ${stats.pairsMade.toLocaleString()} ${stats.pairsMade === 1 ? 'pair' : 'pairs'} made`
              : ''}
          </span>
          <h1
            className="mt-6 font-serif text-[clamp(42px,7vw,76px)] font-semibold leading-[1.03] tracking-[-0.025em] text-ink"
            style={{ textWrap: 'balance' }}
          >
            Nobody should have to learn alone.
          </h1>
          <p dir="rtl" className="mt-3.5 font-hebrew text-[clamp(20px,3vw,28px)] text-brass">
            קְנֵה לְךָ חָבֵר
          </p>
          <p
            className="mx-auto mt-5 max-w-[620px] text-[clamp(17px,2vw,20px)] leading-[1.6] text-ink-muted"
            style={{ textWrap: 'pretty' }}
          >
            Post what you want to learn — a masechta, a sefer, ten minutes of mussar. Someone
            claims it, and you have a chavrusa by the end of the week.
          </p>
          <div className="mt-[34px] flex flex-wrap justify-center gap-3">
            <Link
              to="/requests/new"
              className="rounded-full border border-brass bg-brass px-7 py-[15px] text-[16px] font-semibold text-surface transition-colors hover:border-brass-dark hover:bg-brass-dark"
            >
              Post a request
            </Link>
            <Link
              to="/dashboard"
              className="rounded-full border border-border-strong bg-transparent px-7 py-[15px] text-[16px] font-semibold text-ink transition-colors hover:bg-surface-alt"
            >
              Browse requests
            </Link>
          </div>
          <div className="mt-11 flex flex-wrap justify-center gap-2.5">
            {['Bava Metzia · nights · online', 'Chumash w/ Rashi · beginner', 'Mesilas Yesharim · Sun 7am'].map(
              (chip) => (
                <span
                  key={chip}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2 font-mono text-[12.5px] text-ink-muted"
                >
                  {chip}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <Reveal>
        <section className="mx-auto max-w-[1180px] px-6 py-[84px]">
          <h2 className="font-serif text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.02em] text-ink">
            How it works
          </h2>
          <p className="mt-2 mb-11 text-[17px] text-ink-muted">
            Three steps, and then it's between the two of you.
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-7">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.number} className="rounded-2xl border border-border bg-surface p-7">
                <span className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-surface-sunken font-mono text-[15px] text-brass-dark">
                  {step.number}
                </span>
                <h3 className="mt-[18px] mb-2 font-serif text-[23px] font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="text-[15.5px] leading-[1.6] text-ink-muted" style={{ textWrap: 'pretty' }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-[1180px] px-6 py-[76px]">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-brass-dark">
              In the beis medrash
            </span>
            <h2 className="mt-3 mb-[30px] font-serif text-[clamp(26px,3.2vw,38px)] font-semibold tracking-[-0.02em] text-ink">
              Chavrusas, mid-shakla v'tarya.
            </h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] auto-rows-[190px] gap-3.5">
              {PHOTO_GRID.map((tile) => (
                <div
                  key={tile.caption}
                  className={
                    tile.big
                      ? 'col-span-2 row-span-2 flex items-end rounded-2xl border border-border p-4'
                      : 'flex items-end rounded-2xl border border-border p-3.5'
                  }
                  style={{ backgroundImage: STRIPE_BG }}
                >
                  <span className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-[11.5px] text-brass-dark">
                    {tile.caption}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="border-t border-border bg-ink text-on-dark">
          <div className="mx-auto max-w-[1180px] px-6 py-[76px]">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p dir="rtl" className="font-hebrew text-[22px] text-brass-light">
                  הסכמות
                </p>
                <h2 className="mt-2 font-serif text-[clamp(26px,3.2vw,38px)] font-semibold tracking-[-0.02em] text-surface">
                  With rabbinic endorsement.
                </h2>
              </div>
              <Link to="/haskamas" className="text-[14.5px] font-semibold text-[#e8dfcc] hover:text-surface">
                Read all haskamas
              </Link>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-5">
              {HASKAMA_QUOTES.map((h) => (
                <div
                  key={h.name}
                  className="rounded-2xl border p-[26px]"
                  style={{ borderColor: 'rgba(232,223,204,0.2)', background: 'rgba(232,223,204,0.05)' }}
                >
                  <p className="mb-4.5 font-serif text-[18px] italic leading-[1.6] text-[#f4eee0]">
                    "{h.quote}"
                  </p>
                  <p className="text-[14.5px] font-semibold text-surface">{h.name}</p>
                  <p className="mt-1 text-[13.5px] text-brass-light">{h.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="border-y border-border bg-surface-sunken">
          <div className="mx-auto grid max-w-[1180px] grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-center gap-12 px-6 py-[72px]">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-brass-dark">
                Subscriptions
              </span>
              <h2
                className="mt-3.5 mb-3 font-serif text-[clamp(26px,3.2vw,38px)] font-semibold tracking-[-0.02em] text-ink"
                style={{ textWrap: 'balance' }}
              >
                Tell us what you'd say yes to.
              </h2>
              <p className="max-w-[460px] text-[16.5px] leading-[1.6] text-ink-muted" style={{ textWrap: 'pretty' }}>
                Pick topics, a level, and how far you'd travel. When a matching request is posted,
                you hear about it before anyone else does.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="mb-3.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-brass">
                Notify me about
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Gemara · b'iyun", on: true },
                  { label: 'Within 10 miles of Passaic', on: true },
                  { label: 'Anything on Sunday mornings', on: false },
                ].map((row, i) => (
                  <div
                    key={row.label}
                    className={
                      i < 2
                        ? 'flex items-center justify-between gap-3 border-b border-surface-alt pb-3'
                        : 'flex items-center justify-between gap-3'
                    }
                  >
                    <span className={row.on ? 'text-[15px] text-ink' : 'text-[15px] text-ink-muted'}>
                      {row.label}
                    </span>
                    <span
                      className="relative h-[22px] w-10 flex-none rounded-full"
                      style={{ background: row.on ? '#8a6a3c' : '#e3dbc9' }}
                    >
                      <span
                        className="absolute top-[3px] h-4 w-4 rounded-full bg-surface"
                        style={row.on ? { right: 3 } : { left: 3 }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="mx-auto max-w-[1180px] px-6 py-[84px]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-7">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.attribution} className="m-0 border-brass pl-5" style={{ borderInlineStart: '2px solid #8a6a3c' }}>
                <p className="mb-3.5 font-serif text-[21px] italic leading-[1.5] text-ink" style={{ textWrap: 'pretty' }}>
                  "{t.quote}"
                </p>
                <footer className="text-[14px] text-ink-muted">{t.attribution}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
