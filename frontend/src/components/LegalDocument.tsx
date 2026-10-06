import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Markdown from 'markdown-to-jsx';
import { legalPagesEnabled } from '../config/legal';

// Each Markdown element rendered with the site's own type styles (same scale as the About page).
// markdown-to-jsx builds React elements, so nothing is injected as raw HTML, and raw HTML in the
// documents is not parsed at all.
const MARKDOWN_OPTIONS = {
  disableParsingRawHTML: true,
  forceBlock: true,
  overrides: {
    h1: {
      props: {
        className:
          'font-serif text-[clamp(30px,3.8vw,44px)] font-semibold leading-[1.1] tracking-[-0.02em] text-ink',
      },
    },
    h2: { props: { className: 'mt-11 mb-3 font-serif text-[clamp(22px,2.6vw,27px)] font-semibold leading-[1.25] tracking-[-0.01em] text-ink' } },
    h3: { props: { className: 'mt-7 mb-2.5 font-serif text-[19px] font-semibold leading-[1.3] text-ink' } },
    p: { props: { className: 'mt-4 text-[16.5px] leading-[1.7] text-ink-2' } },
    ul: { props: { className: 'mt-3 list-disc space-y-2 pl-6 text-[16.5px] leading-[1.65] text-ink-2 marker:text-brass' } },
    ol: { props: { className: 'mt-3 list-decimal space-y-2 pl-6 text-[16.5px] leading-[1.65] text-ink-2 marker:text-brass' } },
    li: { props: { className: 'pl-1' } },
    strong: { props: { className: 'font-semibold text-ink' } },
    a: {
      props: {
        className:
          'break-words font-semibold text-brass-dark underline decoration-brass/40 underline-offset-2 hover:text-ink hover:decoration-ink',
      },
    },
  },
};

// Renders one of the bundled legal documents (docs/legal/*.md, imported with ?raw at build time, so no
// API call). While LEGAL_DATE is still the placeholder, the page redirects home instead.
export default function LegalDocument({ source, title }: { source: string; title: string }) {
  useEffect(() => {
    if (!legalPagesEnabled) return;
    const previous = document.title;
    document.title = `${title} — Chavrusa`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  if (!legalPagesEnabled) return <Navigate to="/" replace />;

  return (
    <article className="mx-auto max-w-[720px] px-6 pb-[84px] pt-16">
      <Markdown options={MARKDOWN_OPTIONS}>{source}</Markdown>
    </article>
  );
}
