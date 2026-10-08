import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { useAppState } from '../hooks/useAppState';
import { getCurrentUser, loginAsDemo, login, logout, type LoginInput } from '../services/authService';
import { readSession } from '../services/session';
import { useToast } from './ToastContext';

interface AuthApi {
  user: User | null;
  signIn: (input: LoginInput) => Promise<User>;
  signInDemo: (role: UserRole, remember?: boolean) => Promise<User>;
  signOut: () => Promise<void>;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const users = useAppState((s) => s.users);
  const [version, setVersion] = useState(0);
  const user = useMemo(() => {
    void users;
    void version;
    return getCurrentUser();
  }, [users, version]);
  const hadSession = useMemo(() => {
    void version;
    return readSession() !== null;
  }, [version]);

  useEffect(() => {
    if (hadSession && !user) {
      toast({ tone: 'warning', title: 'Your session has ended', description: 'The account no longer exists in this demo dataset. Sign in again.' });
    }
  }, [hadSession, user, toast]);

  const refreshSession = useCallback(() => setVersion((v) => v + 1), []);

  const signIn = useCallback(
    async (input: LoginInput) => {
      const signedIn = await login(input);
      refreshSession();
      return signedIn;
    },
    [refreshSession],
  );

  const signInDemo = useCallback(
    async (role: UserRole, remember = false) => {
      const signedIn = await loginAsDemo(role, remember);
      refreshSession();
      return signedIn;
    },
    [refreshSession],
  );

  const signOut = useCallback(async () => {
    await logout(user);
    refreshSession();
  }, [user, refreshSession]);

  const api = useMemo<AuthApi>(() => ({ user, signIn, signInDemo, signOut, refreshSession }), [user, signIn, signInDemo, signOut, refreshSession]);
  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Returns the signed-in user. Only call inside routes protected by RequireSession. */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('No signed-in user');
  return user;
}
