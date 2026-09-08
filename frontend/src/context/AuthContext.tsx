import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { decodeJwtUserId } from '../lib/jwt';

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  userId: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const userId = useMemo(() => (token ? decodeJwtUserId(token) : null), [token]);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
