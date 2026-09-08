import { NavLink, Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

const navLinkBase =
  'rounded-full px-3.5 py-2.5 text-[14.5px] transition-colors hover:bg-surface-alt';

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive
    ? `${navLinkBase} bg-surface-sunken border border-border font-semibold text-ink`
    : `${navLinkBase} border border-transparent font-medium text-ink-2`;
}

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="sticky top-0 z-50 border-b border-border backdrop-blur-[10px]"
      style={{ background: 'rgba(250,247,240,0.92)' }}
    >
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span
            className="font-serif text-[21px] font-semibold text-ink"
            style={{ letterSpacing: '-0.01em' }}
          >
            Chavrusa
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          <NavLink to="/" end className={navLinkClassName}>
            Home
          </NavLink>
          <NavLink to="/about" className={navLinkClassName}>
            About
          </NavLink>
          <NavLink to="/haskamas" className={navLinkClassName}>
            Haskamas
          </NavLink>

          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                className={`${navLinkBase} border border-transparent font-medium text-ink-2`}
              >
                Log out
              </button>
              <Link
                to="/dashboard"
                className="rounded-full border border-ink bg-ink px-5 py-2.5 text-[14px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-ink bg-ink px-5 py-2.5 text-[14px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
