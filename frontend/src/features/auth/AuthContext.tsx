/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, setRememberSession } from '../../lib/supabase/client';
import type { ProfileRow } from '../../lib/supabase/database.types';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface SignInResult {
  ok: boolean;
  /** Código estável para a UI mapear mensagens. */
  error?: 'invalid-credentials' | 'user-disabled' | 'network' | 'unknown';
}

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  profile: ProfileRow | null;
  isAdmin: boolean;
  /** Sessão anterior expirou (para mensagem na tela de login). */
  sessionExpired: boolean;
  signIn(email: string, password: string, remember: boolean): Promise<SignInResult>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as ProfileRow;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? 'loading' : 'signed-out',
  );
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const hadSessionRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    let cancelled = false;

    const applySession = async (next: Session | null) => {
      if (cancelled) return;
      setSession(next);
      if (!next) {
        setProfile(null);
        setStatus('signed-out');
        if (hadSessionRef.current) setSessionExpired(true);
        hadSessionRef.current = false;
        return;
      }
      hadSessionRef.current = true;
      setSessionExpired(false);
      const nextProfile = await fetchProfile(next.user.id);
      if (cancelled) return;
      if (nextProfile && !nextProfile.active) {
        // Conta desativada: encerra a sessão imediatamente.
        await supabase.auth.signOut();
        return;
      }
      setProfile(nextProfile);
      setStatus('signed-in');
    };

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch(() => {
        if (!cancelled) setStatus('signed-out');
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean): Promise<SignInResult> => {
      if (!isSupabaseConfigured) return { ok: false, error: 'network' };
      const supabase = getSupabase();
      setRememberSession(remember);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const message = error.message.toLowerCase();
          if (message.includes('fetch') || message.includes('network')) {
            return { ok: false, error: 'network' };
          }
          return { ok: false, error: 'invalid-credentials' };
        }
        const nextProfile = await fetchProfile(data.user.id);
        if (nextProfile && !nextProfile.active) {
          await supabase.auth.signOut();
          return { ok: false, error: 'user-disabled' };
        }
        setSessionExpired(false);
        return { ok: true };
      } catch {
        return { ok: false, error: 'network' };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    hadSessionRef.current = false;
    await getSupabase().auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const next = await fetchProfile(session.user.id);
    if (next) setProfile(next);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile,
      isAdmin: profile?.role === 'admin' && profile.active,
      sessionExpired,
      signIn,
      signOut,
      refreshProfile,
    }),
    [status, session, profile, sessionExpired, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
