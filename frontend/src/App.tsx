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
          <Route path="/haskamas" element={SHOW_HASKAMAS ? <Haskamas /> : <Navigate to="/" replace />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/requests/new" element={<PostRequest />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/matches/:matchId" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
