import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import VerifyEmailBanner from './VerifyEmailBanner';
import ErrorBoundary from './ErrorBoundary';

export default function MainLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <Navbar />
      <ErrorBoundary silent>
        <VerifyEmailBanner />
      </ErrorBoundary>
      <main className="flex-1">
        {/* A crashing page keeps the navbar and footer; keyed by path so navigating away clears the error. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
