import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import gsap from 'gsap';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useAuth, type SignInResult } from '../../features/auth/AuthContext';
import { isApiConfigured } from '../../lib/api/client';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const loginSchema = z.object({
  // Identificador de login: usuário simples (ex.: "alex.rodriguus") ou e-mail.
  email: z.string().trim().min(3, 'Informe o usuário.'),
  password: z.string().min(1, 'Informe a senha.'),
  remember: z.boolean(),
});

type LoginForm = z.infer<typeof loginSchema>;

const ERROR_MESSAGES: Record<NonNullable<SignInResult['error']>, string> = {
  'invalid-credentials': 'Usuário ou senha incorretos. Confira e tente novamente.',
  'user-disabled': 'Este usuário foi desativado. Fale com um administrador.',
  network: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
  unknown: 'Algo deu errado ao entrar. Tente novamente.',
};

function MissingConfig() {
  return (
    <div className="panel-login__banner" role="alert" style={{ marginBottom: 18 }}>
      API não configurada. Defina <code>VITE_API_URL</code> no <code>.env.local</code>{' '}
      apontando para o backend TENKA e reinicie o servidor de desenvolvimento.
      Veja <code>docs/PAINEL.md</code>.
    </div>
  );
}

export default function LoginPage() {
  const { signIn, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  useEffect(() => {
    if (reducedMotion || !cardRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(cardRef.current, {
        y: 22,
        opacity: 0,
        duration: 0.55,
        ease: 'power3.out',
      });
    });
    return () => ctx.revert();
  }, [reducedMotion]);

  const onSubmit = handleSubmit(async ({ email, password, remember }) => {
    setServerError(null);
    const result = await signIn(email, password, remember);
    if (!result.ok) {
      setServerError(ERROR_MESSAGES[result.error ?? 'unknown']);
      return;
    }
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from.startsWith('/painel') ? from : '/painel/projetos', {
      replace: true,
    });
  });

  // O backend próprio não envia e-mail: a recuperação de senha é feita por um
  // administrador (redefine a senha na aba Usuários). Orientamos o usuário.
  const onForgotPassword = () => {
    setServerError(null);
    setResetSent(true);
  };

  return (
    <div className="tenka-panel">
      <div className="panel-login">
        <div ref={cardRef} className="panel-login__card">
          <header style={{ marginBottom: 26 }}>
            <p className="panel-eyebrow" style={{ marginBottom: 12 }}>
              Área interna
            </p>
            <h1 className="panel-login__brand">
              TENKA<em>.</em>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--panel-font)',
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: 0,
                  color: 'var(--panel-text-dim)',
                  marginTop: 10,
                }}
              >
                Entre para acessar o mural de projetos.
              </span>
            </h1>
          </header>

          {!isApiConfigured && <MissingConfig />}

          {sessionExpired && !serverError && (
            <div className="panel-login__banner" role="alert" style={{ marginBottom: 18 }}>
              Sua sessão expirou. Entre novamente para continuar.
            </div>
          )}

          {resetSent && (
            <div
              className="panel-login__banner panel-login__banner--info"
              role="status"
              style={{ marginBottom: 18 }}
            >
              Para redefinir sua senha, peça a um administrador do painel — ele
              gera uma nova senha para você na aba Usuários.
            </div>
          )}

          {serverError && (
            <div className="panel-login__banner" role="alert" style={{ marginBottom: 18 }}>
              {serverError}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 18 }}>
            <div className="panel-field">
              <label htmlFor="login-email">Usuário</label>
              <input
                id="login-email"
                type="text"
                autoComplete="username"
                className="panel-input"
                placeholder="alex.rodriguus"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email && <p className="panel-field__error">{errors.email.message}</p>}
            </div>

            <div className="panel-field">
              <label htmlFor="login-password">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="panel-input"
                  style={{ paddingRight: 48 }}
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="panel-iconbtn"
                  style={{ position: 'absolute', right: 4, top: '50%', translate: '0 -50%' }}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <p className="panel-field__error">{errors.password.message}</p>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <label className="panel-checkbox">
                <input type="checkbox" {...register('remember')} />
                Lembrar sessão
              </label>
              <button
                type="button"
                className="panel-btn panel-btn--ghost panel-btn--sm"
                onClick={onForgotPassword}
                disabled={!isApiConfigured}
              >
                Esqueci a senha
              </button>
            </div>

            <button
              type="submit"
              className="panel-btn panel-btn--primary"
              disabled={isSubmitting || !isApiConfigured}
              style={{ minHeight: 48 }}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle
                    size={17}
                    aria-hidden="true"
                    style={{ animation: 'panel-spin 900ms linear infinite' }}
                  />
                  Entrando…
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
