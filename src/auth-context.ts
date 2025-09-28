import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { setAuthToken as setGlobalAuthToken } from './helpers/authTokenStore';
import React from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

export interface AuthUser {
  userId: string;
  is_admin: boolean;
  is_teacher: boolean;
}

interface JwtPayload {
  userId: string;
  is_admin: boolean;
  is_teacher: boolean;
  exp?: number; // Optional: expiration time
  iat?: number; // Optional: issued at time
}

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  login: (token: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  logout: async () => {},
  login: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const useRequireAuth = () => {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  return { user, token, loading };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback((token: string) => {
    localStorage.setItem('jwt_token', token);
    setToken(token);
    setGlobalAuthToken(token);
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      setUser({ userId: decoded.userId, is_admin: decoded.is_admin, is_teacher: decoded.is_teacher });
      // ログイン時に全データ取得（キャッシュは即期限切れにする）
      import('./helpers/domainApi').then(async (api) => {
        const { appFetch } = await import('./helpers/apiClient');
        const { CacheKeys } = await import('./helpers/cacheKeys');
        const { SERVER_ENDPOINT } = await import('./config/serverEndpoint');
        try {
          await Promise.all([
            api.studentApi.list({ ttlMs: 1 }),
            api.userApi.list(),
            api.teacherApi.list(),
            api.otanoshimiApi.list(),
            api.messagesApi.list(),
            api.boatAssignmentsApi.list(),
            appFetch(`${SERVER_ENDPOINT}/api/otanoshimi`, { requiresAuth: true, cacheKey: CacheKeys.otanoshimi.teams, ttlMs: 1 }),
            appFetch(`${SERVER_ENDPOINT}/api/schedules`, { requiresAuth: true, cacheKey: CacheKeys.schedules.list, ttlMs: 1 })
          ]);
        } catch {
          // 取得失敗は無視
        }
      });
    } catch (error) {
      console.error('JWTのデコードに失敗:', error);
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('jwt_token');
    setUser(null);
    setToken(null);
    setGlobalAuthToken(null);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    if (storedToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(storedToken);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setUser({ userId: decoded.userId, is_admin: decoded.is_admin, is_teacher: decoded.is_teacher });
          setToken(storedToken);
          setGlobalAuthToken(storedToken);
        }
      } catch (error) {
        console.error('localStorageのJWTのデコードに失敗:', error);
        logout();
      }
    }
    setLoading(false);
  }, [logout]);

  return React.createElement(AuthContext.Provider, { value: { user, token, loading, logout, login } }, children);
};
