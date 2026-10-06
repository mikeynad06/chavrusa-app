import { Link, useLocation } from 'react-router-dom';
import { supportEmail } from '../config/legal';

// "Report a problem": opens the /report form, noting the page it came from (and the match, on chat pages).
// Hidden if SUPPORT_EMAIL in config/legal.ts is ever set back to a placeholder.
export default function ReportProblemLink({ matchId, className }: { matchId?: string; className?: string }) {
  const { pathname } = useLocation();
  if (!supportEmail || pathname === '/report') return null;

  const params = new URLSearchParams({ from: pathname });
  if (matchId) params.set('match', matchId);

  return (
    <Link to={`/report?${params.toString()}`} className={className}>
      Report a problem
    </Link>
  );
}
