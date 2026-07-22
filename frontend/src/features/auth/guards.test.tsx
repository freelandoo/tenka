import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAdmin, RequireAuth, RedirectIfAuthed } from './guards';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

type AuthValue = ReturnType<typeof useAuth>;

function authValue(overrides: Partial<AuthValue>): AuthValue {
  return {
    status: 'signed-out',
    session: null,
    profile: null,
    isAdmin: false,
    sessionExpired: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    ...overrides,
  } as AuthValue;
}

function renderAt(path: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/painel/login" element={<div>TELA-LOGIN</div>} />
        <Route path="/painel/projetos" element={<div>TELA-PROJETOS</div>} />
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockedUseAuth.mockReset();
});

describe('RequireAuth', () => {
  it('redireciona usuário não autenticado para /painel/login', () => {
    mockedUseAuth.mockReturnValue(authValue({ status: 'signed-out' }));
    renderAt('/painel/qualquer', <RequireAuth><div>PROTEGIDO</div></RequireAuth>);
    expect(screen.getByText('TELA-LOGIN')).toBeInTheDocument();
    expect(screen.queryByText('PROTEGIDO')).not.toBeInTheDocument();
  });

  it('renderiza o conteúdo para usuário autenticado', () => {
    mockedUseAuth.mockReturnValue(authValue({ status: 'signed-in' }));
    renderAt('/painel/qualquer', <RequireAuth><div>PROTEGIDO</div></RequireAuth>);
    expect(screen.getByText('PROTEGIDO')).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('colaborador é redirecionado para /painel/projetos', () => {
    mockedUseAuth.mockReturnValue(
      authValue({
        status: 'signed-in',
        isAdmin: false,
        profile: {
          id: 'u1',
          name: 'Colab',
          email: null,
          avatar_url: null,
          role: 'collaborator',
          active: true,
          created_at: '',
          updated_at: '',
        },
      }),
    );
    renderAt('/painel/usuarios', <RequireAdmin><div>ADMIN-AREA</div></RequireAdmin>);
    expect(screen.getByText('TELA-PROJETOS')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN-AREA')).not.toBeInTheDocument();
  });

  it('administrador acessa a área', () => {
    mockedUseAuth.mockReturnValue(
      authValue({
        status: 'signed-in',
        isAdmin: true,
        profile: {
          id: 'u1',
          name: 'Admin',
          email: null,
          avatar_url: null,
          role: 'admin',
          active: true,
          created_at: '',
          updated_at: '',
        },
      }),
    );
    renderAt('/painel/usuarios', <RequireAdmin><div>ADMIN-AREA</div></RequireAdmin>);
    expect(screen.getByText('ADMIN-AREA')).toBeInTheDocument();
  });
});

describe('RedirectIfAuthed', () => {
  it('usuário autenticado não volta para a tela de login', () => {
    mockedUseAuth.mockReturnValue(authValue({ status: 'signed-in' }));
    renderAt('/painel/entrar', <RedirectIfAuthed><div>FORM-LOGIN</div></RedirectIfAuthed>);
    expect(screen.getByText('TELA-PROJETOS')).toBeInTheDocument();
    expect(screen.queryByText('FORM-LOGIN')).not.toBeInTheDocument();
  });
});
