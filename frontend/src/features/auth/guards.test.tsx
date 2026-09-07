import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PanelRole, ProfileRow } from '../../lib/supabase/database.types';
import {
  RequireAdmin,
  RequireAuth,
  RequireClient,
  RequireStaff,
  RedirectIfAuthed,
} from './guards';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

type AuthValue = ReturnType<typeof useAuth>;

function profileOf(role: PanelRole): ProfileRow {
  return {
    id: 'u1',
    name: 'Fulano',
    email: null,
    avatar_url: null,
    role,
    active: true,
    client_id: role === 'client' ? 'c1' : null,
    created_at: '',
    updated_at: '',
  };
}

function authValue(overrides: Partial<AuthValue>): AuthValue {
  return {
    status: 'signed-out',
    session: null,
    profile: null,
    role: null,
    isAdmin: false,
    isStaff: false,
    isClient: false,
    sessionExpired: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    ...overrides,
  } as AuthValue;
}

/** Sessão autenticada com o papel dado, com as flags coerentes. */
function signedInAs(role: PanelRole): Partial<AuthValue> {
  return {
    status: 'signed-in',
    profile: profileOf(role),
    role,
    isAdmin: role === 'admin',
    isStaff: role === 'admin' || role === 'staff',
    isClient: role === 'client',
  };
}

function renderAt(path: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/painel/login" element={<div>TELA-LOGIN</div>} />
        <Route path="/painel/projetos" element={<div>TELA-PROJETOS</div>} />
        <Route path="/painel/visao-geral" element={<div>TELA-CLIENTE</div>} />
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

describe('RequireStaff', () => {
  it('cliente não entra na operação — vai para a própria visão geral', () => {
    mockedUseAuth.mockReturnValue(authValue(signedInAs('client')));
    renderAt('/painel/projetos-interno', <RequireStaff><div>OPERACAO</div></RequireStaff>);
    expect(screen.getByText('TELA-CLIENTE')).toBeInTheDocument();
    expect(screen.queryByText('OPERACAO')).not.toBeInTheDocument();
  });

  it('equipe entra', () => {
    mockedUseAuth.mockReturnValue(authValue(signedInAs('staff')));
    renderAt('/painel/projetos-interno', <RequireStaff><div>OPERACAO</div></RequireStaff>);
    expect(screen.getByText('OPERACAO')).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('equipe é redirecionada para /painel/projetos', () => {
    mockedUseAuth.mockReturnValue(authValue(signedInAs('staff')));
    renderAt('/painel/admin', <RequireAdmin><div>ADMIN-AREA</div></RequireAdmin>);
    expect(screen.getByText('TELA-PROJETOS')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN-AREA')).not.toBeInTheDocument();
  });

  it('cliente que digita a URL da administração cai na própria visão geral', () => {
    mockedUseAuth.mockReturnValue(authValue(signedInAs('client')));
    renderAt('/painel/admin', <RequireAdmin><div>ADMIN-AREA</div></RequireAdmin>);
    expect(screen.getByText('TELA-CLIENTE')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN-AREA')).not.toBeInTheDocument();
  });

  it('administrador acessa a área', () => {
    mockedUseAuth.mockReturnValue(authValue(signedInAs('admin')));
    renderAt('/painel/admin', <RequireAdmin><div>ADMIN-AREA</div></RequireAdmin>);
    expect(screen.getByText('ADMIN-AREA')).toBeInTheDocument();
  });
});

describe('RequireClient', () => {
  it('conta da equipe não abre o portal do cliente', () => {
    mockedUseAuth.mockReturnValue(authValue(signedInAs('admin')));
    renderAt('/painel/meus-projetos', <RequireClient><div>PORTAL</div></RequireClient>);
    expect(screen.getByText('TELA-PROJETOS')).toBeInTheDocument();
    expect(screen.queryByText('PORTAL')).not.toBeInTheDocument();
  });

  it('cliente abre o portal', () => {
    mockedUseAuth.mockReturnValue(authValue(signedInAs('client')));
    renderAt('/painel/meus-projetos', <RequireClient><div>PORTAL</div></RequireClient>);
    expect(screen.getByText('PORTAL')).toBeInTheDocument();
  });
});

describe('RedirectIfAuthed', () => {
  it('usuário autenticado não volta para a tela de login', () => {
    mockedUseAuth.mockReturnValue(authValue(signedInAs('staff')));
    renderAt('/painel/entrar', <RedirectIfAuthed><div>FORM-LOGIN</div></RedirectIfAuthed>);
    expect(screen.getByText('TELA-PROJETOS')).toBeInTheDocument();
    expect(screen.queryByText('FORM-LOGIN')).not.toBeInTheDocument();
  });

  it('cliente autenticado vai para a visão geral dele', () => {
    mockedUseAuth.mockReturnValue(authValue(signedInAs('client')));
    renderAt('/painel/entrar', <RedirectIfAuthed><div>FORM-LOGIN</div></RedirectIfAuthed>);
    expect(screen.getByText('TELA-CLIENTE')).toBeInTheDocument();
  });
});
