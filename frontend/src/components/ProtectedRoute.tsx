import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginPathFor } from '../lib/redirect';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Remember where they were headed (e.g. a match link from an email) so login can return them there.
    return <Navigate to={loginPathFor(location.pathname + location.search + location.hash)} replace />;
  }

  return <Outlet />;
}
