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
import { ApiError, loadTokens, onUnauthorized } from '../../lib/api/client';
import type { ProfileRow } from '../../lib/supabase/database.types';
import * as auth from './authService';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface SignInResult {
  ok: boolean;
  /** Código estável para a UI mapear mensagens. */
  error?: 'invalid-credentials' | 'user-disabled' | 'network' | 'unknown';
}

/**
 * Sessão enxuta derivada do perfil — mantém a forma `{ user: { id, email } }`
 * que os consumidores (NotificationsContext, SettingsPage) já esperavam do
 * supabase-js, sem arrastar o SDK.
 */
export interface AuthSession {
  user: { id: string; email: string | null };
}

interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  profile: ProfileRow | null;
  isAdmin: boolean;
  /** Sessão anterior expirou (para mensagem na tela de login). */
  sessionExpired: boolean;
  signIn(email: string, password: string, remember: boolean): Promise<SignInResult>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromProfile(profile: ProfileRow | null): AuthSession | null {
  return profile ? { user: { id: profile.id, email: profile.email } } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Se há tokens guardados, começa carregando (valida via /auth/me); senão já
  // está deslogado.
  const [status, setStatus] = useState<AuthStatus>(() =>
    loadTokens() ? 'loading' : 'signed-out',
  );
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const hadSessionRef = useRef(false);

  // Revalida a sessão no boot e reage a uma sessão morta (refresh falhou).
  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onUnauthorized(() => {
      if (cancelled) return;
      if (hadSessionRef.current) setSessionExpired(true);
      hadSessionRef.current = false;
      setProfile(null);
      setStatus('signed-out');
    });

    if (loadTokens()) {
      auth
        .me()
        .then((next) => {
          if (cancelled) return;
          hadSessionRef.current = true;
          setProfile(next);
          setStatus('signed-in');
        })
        .catch(() => {
          // onUnauthorized já cobre 401; qualquer outra falha = deslogado.
          if (!cancelled) setStatus('signed-out');
        });
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean): Promise<SignInResult> => {
      try {
        const next = await auth.login(email, password, remember);
        hadSessionRef.current = true;
        setSessionExpired(false);
        setProfile(next);
        setStatus('signed-in');
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === 'network') return { ok: false, error: 'network' };
          if (error.code === 'user-disabled') return { ok: false, error: 'user-disabled' };
          if (error.code === 'invalid-credentials') {
            return { ok: false, error: 'invalid-credentials' };
          }
          return { ok: false, error: 'unknown' };
        }
        return { ok: false, error: 'unknown' };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    hadSessionRef.current = false;
    await auth.logout();
    setProfile(null);
    setStatus('signed-out');
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const next = await auth.me();
      setProfile(next);
    } catch {
      /* mantém o último perfil conhecido */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session: sessionFromProfile(profile),
      profile,
      isAdmin: profile?.role === 'admin' && profile.active,
      sessionExpired,
      signIn,
      signOut,
      refreshProfile,
    }),
    [status, profile, sessionExpired, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
