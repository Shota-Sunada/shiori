import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { auth, requestAndRegisterToken } from './firebase';
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

      // If user is logged in, and is a student, request notification permission
      if (user && user.email && !user.email.includes('teacher')) {
        // Assuming student ID (gakuseki) is the part of the email before '@'
        const gakuseki = user.email.split('@')[0];
        // This is a good place for more robust role checking, e.g., using custom claims
        requestAndRegisterToken(gakuseki);
      }
    });
    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.removeItem('fcm_token_registered'); // Clear session flag on logout
    await signOut(auth);
  }, []);

  return React.createElement(AuthContext.Provider, { value: { user, loading, logout } }, children);
};
