import { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      login(token);
      navigate('/dashboard');
    }
  }, [token, login, navigate]);

  if (token) return null;

  return (
    <div className="mx-auto max-w-[480px] px-6 pt-24 text-center">
      <h1 className="font-serif text-[26px] font-semibold text-ink">Sign-in didn't go through</h1>
      <p className="mt-3 text-[15px] text-ink-muted">
        Something went wrong signing you in. Please try again.
      </p>
      <Link
        to="/login"
        className="mt-6 inline-block rounded-full border border-ink bg-ink px-7 py-[13px] text-[15px] font-semibold text-bg"
      >
        Back to login
      </Link>
    </div>
  );
}
