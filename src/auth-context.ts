import { createContext, useContext, useEffect, useState, type ReactNode, useCallback, useRef } from 'react';
import { setAuthToken as setGlobalAuthToken } from './helpers/authTokenStore';
import React from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { isOffline } from './helpers/isOffline';

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
  const prefetchingRef = useRef(false);

  const hasAppFetchCacheEntry = useCallback((key: string) => {
    if (!key) return false;
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return false;
    try {
      return window.localStorage.getItem(`appFetchCache_${key}`) !== null;
    } catch {
      return false;
    }
  }, []);

  const login = useCallback((token: string) => {
    localStorage.setItem('jwt_token', token);
    setToken(token);
    setGlobalAuthToken(token);
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      setUser({ userId: decoded.userId, is_admin: decoded.is_admin, is_teacher: decoded.is_teacher });
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

  useEffect(() => {
    if (loading || !user || !token) return;
    if (isOffline()) return;

    const prefetchCaches = async () => {
      const { CacheKeys } = await import('./helpers/cacheKeys');

      const missingFlags = {
        students: !hasAppFetchCacheEntry(CacheKeys.students.all),
        users: !hasAppFetchCacheEntry(CacheKeys.users.list),
        teachers: !hasAppFetchCacheEntry(CacheKeys.teachers.list),
        messages: !hasAppFetchCacheEntry(CacheKeys.messages.list),
        otanoshimiTeams: !hasAppFetchCacheEntry(CacheKeys.otanoshimi.teams),
        schedules: !hasAppFetchCacheEntry(CacheKeys.schedules.list)
      } as const;

      if (!Object.values(missingFlags).some(Boolean)) {
        return;
      }

      if (prefetchingRef.current) {
        return;
      }
      prefetchingRef.current = true;

      try {
        const [api, { appFetch }, { SERVER_ENDPOINT }] = await Promise.all([import('./helpers/domainApi'), import('./helpers/apiClient'), import('./config/serverEndpoint')]);

        const tasks: Array<Promise<unknown>> = [];
        if (missingFlags.students) {
          tasks.push(api.studentApi.list({ alwaysFetch: true }));
        }
        if (missingFlags.users) {
          tasks.push(api.userApi.list());
        }
        if (missingFlags.teachers) {
          tasks.push(api.teacherApi.list());
        }
        if (missingFlags.messages) {
          tasks.push(api.messagesApi.list());
        }
        if (missingFlags.otanoshimiTeams) {
          tasks.push(appFetch(`${SERVER_ENDPOINT}/api/otanoshimi`, { requiresAuth: true, cacheKey: CacheKeys.otanoshimi.teams }));
        }
        if (missingFlags.schedules) {
          tasks.push(appFetch(`${SERVER_ENDPOINT}/api/schedules`, { requiresAuth: true, cacheKey: CacheKeys.schedules.list }));
        }

        if (tasks.length === 0) {
          return;
        }

        await Promise.allSettled(tasks);
      } catch (error) {
        console.warn('初期キャッシュ作成中にエラーが発生しました:', error);
      } finally {
        prefetchingRef.current = false;
      }
    };

    void prefetchCaches();
  }, [hasAppFetchCacheEntry, loading, token, user]);

  return React.createElement(AuthContext.Provider, { value: { user, token, loading, logout, login } }, children);
};
