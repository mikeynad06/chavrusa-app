export default function About() {
  return (
    <div className="mx-auto max-w-[720px] px-6 pb-[84px] pt-16">
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-brass-dark">About</span>
      <h1 className="mt-3 font-serif text-[clamp(30px,3.8vw,44px)] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
        Nobody should have to learn alone.
      </h1>

      <div className="mt-8 flex flex-col gap-5 text-[16.5px] leading-[1.7] text-ink-2">
        <p>
          Finding a chavrusa has always come down to who you happen to know — the person
          learning next to you in shul, a friend of a friend, whoever your rav thinks to
          introduce you to. If you're new in town, keeping odd hours, or just don't have that
          connection yet, you're stuck.
        </p>
        <p>
          Chavrusa is a simple board: post what you want to learn, and anyone looking for the
          same thing can claim it. No profiles to browse, no algorithm — just a request and
          someone who says yes.
        </p>
        <p>
          Once you're matched, the conversation stays inside the app. You decide together
          when to start, how to learn, and whether to move it elsewhere from there.
        </p>
        <p>It's free, and it's staying that way.</p>
      </div>
    </div>
  );
}
