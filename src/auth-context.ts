import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import React from 'react';
import { jwtDecode } from 'jwt-decode';

interface AuthUser {
  userId: string;
  username: string;
}

interface JwtPayload {
  userId: string;
  username: string;
  exp?: number; // Optional: expiration time
  iat?: number; // Optional: issued at time
}

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  login: (token: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  login: () => {},
});

export const useAuth = () => useContext(AuthContext);

import { useNavigate } from 'react-router-dom'; // 追加

export const useRequireAuth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  return { user, loading };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback((token: string) => {
    localStorage.setItem('jwt_token', token);
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      setUser({ userId: decoded.userId, username: decoded.username });
    } catch (error) {
      console.error('Error decoding JWT:', error);
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('jwt_token');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        // Check if token is expired
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          logout(); // Token expired, log out
        } else {
          setUser({ userId: decoded.userId, username: decoded.username });
        }
      } catch (error) {
        console.error('Error decoding JWT from localStorage:', error);
        logout(); // Invalid token, log out
      }
    }
    setLoading(false);
  }, [logout]);

  return React.createElement(AuthContext.Provider, { value: { user, loading, logout, login } }, children);
};