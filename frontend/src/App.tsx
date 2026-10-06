import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SHOW_HASKAMAS } from './config/features.ts';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import ForgotPassword from './pages/ForgotPassword.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import VerifyEmail from './pages/VerifyEmail.tsx';
import AuthCallback from './pages/AuthCallback.tsx';
import Landing from './pages/Landing.tsx';
import Dashboard from './pages/Dashboard.tsx';
import PostRequest from './pages/PostRequest.tsx';
import Matches from './pages/Matches.tsx';
import Chat from './pages/Chat.tsx';
import About from './pages/About.tsx';
import Haskamas from './pages/Haskamas.tsx';
import Profile from './pages/Profile.tsx';
import NotFound from './pages/NotFound.tsx';
import { legalPagesEnabled } from './config/legal.ts';

// Loaded on demand: the Markdown renderer and the two documents only download when someone opens them.
const Privacy = lazy(() => import('./pages/Privacy.tsx'));
const Terms = lazy(() => import('./pages/Terms.tsx'));

const legalPage = (page: React.ReactNode) =>
  legalPagesEnabled ? (
    <Suspense fallback={<div className="mx-auto max-w-[720px] px-6 py-16 text-[15px] text-ink-muted">Loading…</div>}>{page}</Suspense>
  ) : (
    // Until LEGAL_DATE is set in config/legal.ts, these pages don't exist yet.
    <Navigate to="/" replace />
  );
import DeleteAccountConfirm from './pages/DeleteAccountConfirm.tsx';
import MainLayout from './components/MainLayout.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={legalPage(<Privacy />)} />
          <Route path="/terms" element={legalPage(<Terms />)} />
          <Route path="/haskamas" element={SHOW_HASKAMAS ? <Haskamas /> : <Navigate to="/" replace />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/requests/new" element={<PostRequest />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/matches/:matchId" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            {/* The emailed deletion link needs a login to the same account; logged-out visitors come back after logging in. */}
            <Route path="/delete-account" element={<DeleteAccountConfirm />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
