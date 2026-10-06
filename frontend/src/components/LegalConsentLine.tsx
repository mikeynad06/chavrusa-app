import { Link } from 'react-router-dom';
import { legalPagesEnabled } from '../config/legal';

// "By creating an account you agree to…", shown on Register (and under Google sign-in) once the
// Privacy Policy and Terms are live (LEGAL_DATE set in config/legal.ts).
export default function LegalConsentLine({ className = '' }: { className?: string }) {
  if (!legalPagesEnabled) return null;
  const link = 'font-semibold text-brass-dark underline decoration-brass/40 underline-offset-2 hover:text-ink hover:decoration-ink';
  return (
    <p className={`text-[13px] leading-[1.55] text-ink-muted ${className}`}>
      By creating an account you agree to our{' '}
      <Link to="/terms" className={link}>
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link to="/privacy" className={link}>
        Privacy Policy
      </Link>
      .
    </p>
  );
}
