import { useAuth } from '../context/AuthContext';
import { AppShell } from './AppShell';
import { PublicLayout } from './PublicLayout';

/** Shared pages (Help, Track, Not found) use the signed-in shell when a session exists. */
export function SessionLayout() {
  const { user } = useAuth();
  return user ? <AppShell /> : <PublicLayout />;
}
