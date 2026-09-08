import { HASKAMA_QUOTES } from '../data/haskamas';

export default function Haskamas() {
  return (
    <div className="mx-auto max-w-[900px] px-6 pb-[84px] pt-16">
      <p dir="rtl" className="font-hebrew text-[22px] text-brass">
        הסכמות
      </p>
      <h1 className="mt-2 font-serif text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.02em] text-ink">
        With rabbinic endorsement.
      </h1>
      <p className="mt-3 max-w-[560px] text-[16px] leading-[1.6] text-ink-muted">
        Rabbanim who've seen this used in their own kehillos.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        {HASKAMA_QUOTES.map((h) => (
          <div key={h.name} className="rounded-2xl border border-border bg-surface p-[30px]">
            <p className="font-serif text-[20px] italic leading-[1.6] text-ink" style={{ textWrap: 'pretty' }}>
              "{h.quote}"
            </p>
            <p className="mt-4 text-[15px] font-semibold text-ink">{h.name}</p>
            <p className="mt-1 text-[13.5px] text-brass-dark">{h.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
