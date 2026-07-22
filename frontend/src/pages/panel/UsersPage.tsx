import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoaderCircle, RefreshCw, Search, ShieldCheck, UserPlus } from 'lucide-react';
import type { PanelRole } from '../../lib/supabase/database.types';
import * as usersService from '../../features/users/usersService';
import type { UserWithProjects } from '../../features/users/usersService';
import { useAuth } from '../../features/auth/AuthContext';
import { useToast } from '../../features/panel/ToastContext';
import { PanelOverlay } from '../../features/panel/PanelOverlay';
import { formatDate, initials } from '../../features/panel/format';

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.'),
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  password: z.string().min(8, 'A senha precisa de no mínimo 8 caracteres.'),
  role: z.enum(['admin', 'collaborator']),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

type RoleFilter = 'todos' | PanelRole;

interface ConfirmState {
  user: UserWithProjects;
  action: 'promote' | 'demote' | 'deactivate' | 'activate';
}

const CONFIRM_COPY: Record<ConfirmState['action'], { title: string; body: string; cta: string }> = {
  promote: {
    title: 'Promover a administrador?',
    body: 'Administradores veem todos os projetos, valores e podem gerenciar usuários.',
    cta: 'Sim, promover',
  },
  demote: {
    title: 'Rebaixar para colaborador?',
    body: 'O usuário passará a ver somente os projetos em que estiver atribuído.',
    cta: 'Sim, rebaixar',
  },
  deactivate: {
    title: 'Desativar usuário?',
    body: 'O usuário perde o acesso ao painel imediatamente. Nada é excluído.',
    cta: 'Sim, desativar',
  },
  activate: {
    title: 'Reativar usuário?',
    body: 'O usuário volta a ter acesso ao painel com a função atual.',
    cta: 'Sim, reativar',
  },
};

export default function UsersPage() {
  const { profile: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithProjects[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('todos');
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
      const rows = await usersService.fetchUsers();
      setUsers(rows);
    } catch {
      setLoadFailed(true);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== 'todos' && user.role !== roleFilter) return false;
      if (!term) return true;
      return (
        user.name.toLowerCase().includes(term) ||
        (user.email ?? '').toLowerCase().includes(term)
      );
    });
  }, [users, search, roleFilter]);

  const activeAdminCount = useMemo(
    () => (users ?? []).filter((u) => u.role === 'admin' && u.active).length,
    [users],
  );

  const isLastActiveAdmin = (user: UserWithProjects) =>
    user.role === 'admin' && user.active && activeAdminCount <= 1;

  const applyConfirm = async () => {
    if (!confirm) return;
    const { user, action } = confirm;
    setBusy(true);
    try {
      if (action === 'promote') await usersService.setUserRole(user.id, 'admin');
      if (action === 'demote') await usersService.setUserRole(user.id, 'collaborator');
      if (action === 'deactivate') await usersService.setUserActive(user.id, false);
      if (action === 'activate') await usersService.setUserActive(user.id, true);
      toast('success', 'Usuário atualizado.');
      setConfirm(null);
      await load();
    } catch (error) {
      toast(
        'error',
        error instanceof Error ? error.message : 'Falha ao atualizar o usuário.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 1080, width: '100%', margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
            Administração
          </p>
          <h1 style={{ fontSize: 23, fontWeight: 700 }}>Usuários</h1>
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="panel-btn panel-btn--primary"
          onClick={() => setCreating(true)}
        >
          <UserPlus size={16} aria-hidden="true" />
          Novo usuário
        </button>
      </header>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={15}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              translate: '0 -50%',
              color: 'var(--panel-text-faint)',
            }}
          />
          <input
            className="panel-input"
            style={{ paddingLeft: 40 }}
            placeholder="Buscar por nome ou e-mail…"
            aria-label="Buscar usuários"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="panel-select"
          style={{ width: 'auto' }}
          aria-label="Filtrar por função"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
        >
          <option value="todos">Todas as funções</option>
          <option value="admin">Administradores</option>
          <option value="collaborator">Colaboradores</option>
        </select>
      </div>

      {users === null ? (
        <p style={{ color: 'var(--panel-text-faint)', fontSize: 14 }}>Carregando usuários…</p>
      ) : loadFailed ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <p style={{ color: '#ff8a87', fontSize: 14 }}>Falha ao carregar os usuários.</p>
          <button type="button" className="panel-btn panel-btn--sm" onClick={() => void load()}>
            <RefreshCw size={14} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--panel-line)',
            borderRadius: 16,
            background: 'var(--panel-surface)',
            overflowX: 'auto',
          }}
        >
          <table className="users-table">
            <thead>
              <tr>
                <th scope="col">Usuário</th>
                <th scope="col">E-mail</th>
                <th scope="col">Função</th>
                <th scope="col">Status</th>
                <th scope="col">Desde</th>
                <th scope="col">Projetos</th>
                <th scope="col">
                  <span className="sr-only" style={{ position: 'absolute', clip: 'rect(0 0 0 0)' }}>
                    Ações
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isMe = user.id === me?.id;
                const lastAdmin = isLastActiveAdmin(user);
                return (
                  <tr key={user.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <span className="panel-avatar" aria-hidden="true">
                          {initials(user.name)}
                        </span>
                        <strong style={{ color: 'var(--panel-text)' }}>
                          {user.name}
                          {isMe && (
                            <span style={{ color: 'var(--panel-text-faint)', fontWeight: 400 }}>
                              {' '}
                              (você)
                            </span>
                          )}
                        </strong>
                      </span>
                    </td>
                    <td>{user.email ?? '—'}</td>
                    <td>
                      <span
                        className={`role-chip${user.role === 'admin' ? ' role-chip--admin' : ''}`}
                      >
                        {user.role === 'admin' && <ShieldCheck size={12} aria-hidden="true" />}
                        {user.role === 'admin' ? 'Admin' : 'Colaborador'}
                      </span>
                    </td>
                    <td>
                      <span className={`role-chip${user.active ? '' : ' role-chip--inactive'}`}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td
                      style={{ maxWidth: 220 }}
                      title={user.projectNames.join(', ') || undefined}
                    >
                      {user.projectNames.length === 0 ? (
                        '—'
                      ) : (
                        <span
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {user.projectNames.join(', ')}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="panel-btn panel-btn--sm"
                          disabled={lastAdmin && user.role === 'admin'}
                          title={
                            lastAdmin
                              ? 'O último administrador ativo não pode ser rebaixado.'
                              : undefined
                          }
                          onClick={() =>
                            setConfirm({
                              user,
                              action: user.role === 'admin' ? 'demote' : 'promote',
                            })
                          }
                        >
                          {user.role === 'admin' ? 'Tornar colaborador' : 'Tornar admin'}
                        </button>
                        <button
                          type="button"
                          className={`panel-btn panel-btn--sm${
                            user.active ? ' panel-btn--danger' : ''
                          }`}
                          disabled={lastAdmin && user.active}
                          title={
                            lastAdmin
                              ? 'O último administrador ativo não pode ser desativado.'
                              : undefined
                          }
                          onClick={() =>
                            setConfirm({
                              user,
                              action: user.active ? 'deactivate' : 'activate',
                            })
                          }
                        >
                          {user.active ? 'Desativar' : 'Reativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>
                    Nenhum usuário encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void load();
          }}
        />
      )}

      {confirm && (
        <PanelOverlay
          variant="modal"
          labelledBy="confirm-user-title"
          onClose={() => setConfirm(null)}
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <h2 id="confirm-user-title">{CONFIRM_COPY[confirm.action].title}</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--panel-text-dim)' }}>
              <strong style={{ color: 'var(--panel-text)' }}>{confirm.user.name}</strong> —{' '}
              {CONFIRM_COPY[confirm.action].body}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="panel-btn panel-btn--ghost"
                onClick={() => setConfirm(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`panel-btn${
                  confirm.action === 'deactivate' ? ' panel-btn--danger' : ' panel-btn--primary'
                }`}
                disabled={busy}
                onClick={() => void applyConfirm()}
              >
                {busy ? 'Aplicando…' : CONFIRM_COPY[confirm.action].cta}
              </button>
            </div>
          </div>
        </PanelOverlay>
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose(): void;
  onCreated(): void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', password: '', role: 'collaborator' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await usersService.createUser(values);
      toast('success', `Usuário ${values.name} criado.`);
      onCreated();
    } catch (error) {
      toast(
        'error',
        error instanceof Error ? error.message : 'Falha ao criar o usuário.',
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <PanelOverlay variant="modal" labelledBy="create-user-title" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 18 }}>
        <div>
          <p className="panel-eyebrow" style={{ marginBottom: 8 }}>
            Fluxo seguro via Edge Function
          </p>
          <h2 id="create-user-title">Novo usuário</h2>
        </div>

        <div className="panel-field">
          <label htmlFor="new-user-name">Nome *</label>
          <input id="new-user-name" className="panel-input" {...register('name')} />
          {errors.name && <p className="panel-field__error">{errors.name.message}</p>}
        </div>

        <div className="panel-field">
          <label htmlFor="new-user-email">E-mail *</label>
          <input
            id="new-user-email"
            type="email"
            className="panel-input"
            {...register('email')}
          />
          {errors.email && <p className="panel-field__error">{errors.email.message}</p>}
        </div>

        <div className="panel-field">
          <label htmlFor="new-user-password">Senha inicial *</label>
          <input
            id="new-user-password"
            type="password"
            autoComplete="new-password"
            className="panel-input"
            {...register('password')}
          />
          {errors.password && <p className="panel-field__error">{errors.password.message}</p>}
        </div>

        <div className="panel-field">
          <label htmlFor="new-user-role">Função</label>
          <select id="new-user-role" className="panel-select" {...register('role')}>
            <option value="collaborator">Colaborador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="panel-btn panel-btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="panel-btn panel-btn--primary" disabled={submitting}>
            {submitting ? (
              <>
                <LoaderCircle
                  size={16}
                  aria-hidden="true"
                  style={{ animation: 'panel-spin 900ms linear infinite' }}
                />
                Criando…
              </>
            ) : (
              'Criar usuário'
            )}
          </button>
        </div>
      </form>
    </PanelOverlay>
  );
}
