import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { SHOW_HASKAMAS } from '../config/features';

const navLinkBase =
  'rounded-full px-3.5 py-2.5 text-[14.5px] transition-colors hover:bg-surface-alt';

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive
    ? `${navLinkBase} bg-surface-sunken border border-border font-semibold text-ink`
    : `${navLinkBase} border border-transparent font-medium text-ink-2`;
}

// Mobile panel rows: full-width, larger tap targets.
const mobileLinkBase = 'block rounded-xl px-4 py-3 text-[16px] transition-colors hover:bg-surface-alt';

function mobileLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive
    ? `${mobileLinkBase} bg-surface-sunken font-semibold text-ink`
    : `${mobileLinkBase} font-medium text-ink-2`;
}

const primaryButton =
  'rounded-full border border-ink bg-ink px-5 py-2.5 text-[14px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu whenever the route changes (any link tap, back button, redirect).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // While open: Escape closes it and returns focus to the toggle; focus starts on the first link.
  useEffect(() => {
    if (!menuOpen) return;
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/', label: 'Home', end: true },
    { to: '/about', label: 'About' },
    ...(SHOW_HASKAMAS ? [{ to: '/haskamas', label: 'Haskamas' }] : []),
    ...(isAuthenticated
      ? [
          { to: '/matches', label: 'Matches' },
          { to: '/profile', label: 'Profile' },
        ]
      : []),
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b border-border backdrop-blur-[10px]"
      style={{ background: 'rgba(250,247,240,0.92)' }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span
            className="font-serif text-[21px] font-semibold text-ink"
            style={{ letterSpacing: '-0.01em' }}
          >
            Chavrusa
          </span>
        </Link>

        {/* Tablet and up: inline links */}
        <nav aria-label="Main" className="hidden flex-wrap items-center gap-2 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navLinkClassName}>
              {l.label}
            </NavLink>
          ))}

          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                className={`${navLinkBase} border border-transparent font-medium text-ink-2`}
              >
                Log out
              </button>
              <Link to="/dashboard" className={primaryButton}>
                Dashboard
              </Link>
            </>
          ) : (
            <Link to="/login" className={primaryButton}>
              Log in
            </Link>
          )}
        </nav>

        {/* Below tablet: hamburger */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="-mr-2 rounded-full p-2.5 text-ink transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass md:hidden"
        >
          {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-menu" ref={panelRef} className="border-t border-border bg-bg md:hidden">
          <nav aria-label="Main" className="mx-auto flex max-w-[1180px] flex-col gap-1 px-4 pb-5 pt-3">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={mobileLinkClassName}>
                {l.label}
              </NavLink>
            ))}

            <div className="mt-3 flex flex-col gap-2.5 border-t border-border px-2 pt-4">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className={`${primaryButton} py-3 text-center text-[15px]`}>
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full border border-border-strong py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-surface-alt"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className={`${primaryButton} py-3 text-center text-[15px]`}>
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-full border border-border-strong py-3 text-center text-[15px] font-semibold text-ink transition-colors hover:bg-surface-alt"
                  >
                    Create an account
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
