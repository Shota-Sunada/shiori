import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import React from 'react';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return React.createElement(AuthContext.Provider, { value: { user, loading, logout } }, children);
};
