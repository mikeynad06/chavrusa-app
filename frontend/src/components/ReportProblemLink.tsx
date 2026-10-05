import { supportEmail } from '../config/legal';

// "Report a problem": opens the user's email app addressed to support. Renders nothing until
// SUPPORT_EMAIL in config/legal.ts is filled in.
export default function ReportProblemLink({ matchId, className }: { matchId?: string; className?: string }) {
  if (!supportEmail) return null;

  const subject = matchId ? `ChavrusaApp report (match ${matchId})` : 'ChavrusaApp report';
  const body = [
    'What happened? Please describe what you were doing, what you expected, and what you saw instead:',
    '',
    '',
    '',
    '---',
    `Page: ${window.location.href}`,
    ...(matchId ? [`Match: ${matchId}`] : []),
  ].join('\n');
  const href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <a href={href} className={className}>
      Report a problem
    </a>
  );
}
