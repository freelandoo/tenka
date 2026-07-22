import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssignmentModal } from './AssignmentModal';
import { useNotifications } from './NotificationsContext';
import type { NotificationRow } from '../../lib/supabase/database.types';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>();
  return { ...original, useNavigate: () => navigateMock };
});

vi.mock('./NotificationsContext', () => ({
  useNotifications: vi.fn(),
}));

const mockedUseNotifications = vi.mocked(useNotifications);

const notification: NotificationRow = {
  id: 'notif-1',
  user_id: 'u2',
  project_id: 'proj-9',
  type: 'assignment',
  title: 'Você foi adicionado a um novo projeto',
  message: 'Ana adicionou você ao projeto "App TENKA". Entrega: 01/10/2026.',
  seen_at: null,
  read_at: null,
  created_at: '2026-07-18T10:00:00Z',
};

function setup(pending: NotificationRow[]) {
  const markSeen = vi.fn().mockResolvedValue(undefined);
  const markRead = vi.fn().mockResolvedValue(undefined);
  mockedUseNotifications.mockReturnValue({
    notifications: pending,
    unreadCount: pending.length,
    loading: false,
    pendingAssignments: pending,
    refresh: vi.fn(),
    markSeen,
    markRead,
  });
  render(
    <MemoryRouter>
      <AssignmentModal />
    </MemoryRouter>,
  );
  return { markSeen, markRead };
}

beforeEach(() => {
  navigateMock.mockReset();
});

describe('AssignmentModal', () => {
  it('não renderiza nada sem atribuições pendentes', () => {
    setup([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('apresenta o modal para o usuário atribuído', () => {
    setup([notification]);
    expect(
      screen.getByRole('heading', { name: 'Você foi adicionado a um novo projeto' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/App TENKA/)).toBeInTheDocument();
  });

  it('"Abrir projeto" marca como lida e navega ao Kanban com o ID do projeto', () => {
    const { markRead } = setup([notification]);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir projeto' }));
    expect(markRead).toHaveBeenCalledWith(['notif-1']);
    expect(navigateMock).toHaveBeenCalledWith('/painel/projetos', {
      state: { highlightProjectId: 'proj-9' },
    });
  });

  it('"Ver depois" marca como vista sem navegar', () => {
    const { markSeen } = setup([notification]);
    fireEvent.click(screen.getByRole('button', { name: 'Ver depois' }));
    expect(markSeen).toHaveBeenCalledWith(['notif-1']);
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
