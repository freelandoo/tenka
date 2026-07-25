import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectNotesSection } from './ProjectNotes';
import * as service from '../services/projectsService';
import { useAuth } from '../../auth/AuthContext';
import type { ProfileRow, ProjectNoteRow } from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';

vi.mock('../services/projectsService', () => ({
  fetchNotes: vi.fn(),
  addNote: vi.fn(),
  fetchContactStatus: vi.fn(),
}));

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

// SSE não existe no jsdom; a inscrição vira no-op nos testes.
vi.mock('../../../lib/api/events', () => ({ subscribeRealtime: () => () => {} }));

const mockedService = vi.mocked(service);
const mockedUseAuth = vi.mocked(useAuth);

const profiles: ProfileRow[] = [
  {
    id: 'u1',
    name: 'Ana',
    email: 'ana',
    avatar_url: null,
    role: 'admin',
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  } as ProfileRow,
];

function makeProject(over: Partial<BoardProject> = {}): BoardProject {
  return {
    id: 'p1',
    name: 'App TENKA',
    description: '',
    value_cents: 0,
    monthly_fee_cents: 0,
    subscription_active: false,
    client_name: 'Cliente',
    client_phone: '(11) 98888-7777',
    client_id: null,
    due_day: null,
    client_email: 'cliente@exemplo.com',
    company: 'tenka',
    due_date: '2026-10-01',
    status: 'inicio',
    color_key: 'amarelo',
    position: 0,
    created_by: 'u1',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    archived_at: null,
    finalized_at: null,
    assignees: [],
    ...over,
  } as BoardProject;
}

function makeNote(over: Partial<ProjectNoteRow> = {}): ProjectNoteRow {
  return {
    id: 'n1',
    project_id: 'p1',
    author_id: 'u1',
    body: 'Primeira observação',
    channel: 'registro',
    meeting_at: null,
    meeting_link: '',
    delivery: {},
    created_at: '2026-07-20T12:00:00Z',
    updated_at: '2026-07-20T12:00:00Z',
    deleted_at: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    profile: { id: 'u1', name: 'Ana', role: 'admin' },
    isAdmin: true,
  } as ReturnType<typeof useAuth>);
  // Padrão dos testes: cliente já conversou, então nenhum aviso aparece.
  mockedService.fetchContactStatus.mockResolvedValue({
    hasConversation: true,
    hasInbound: true,
    conversationId: 'c1',
  });
});

describe('ProjectNotesSection', () => {
  it('não oferece edição — observação é registro imutável', async () => {
    mockedService.fetchNotes.mockResolvedValue([makeNote()]);
    render(<ProjectNotesSection project={makeProject()} profiles={profiles} />);

    await screen.findByText('Primeira observação');
    // O botão de editar existia antes desta feature; sua ausência é o requisito.
    expect(screen.queryByLabelText('Editar observação')).toBeNull();
  });

  it('envia com o canal escolhido no botão', async () => {
    mockedService.fetchNotes.mockResolvedValue([]);
    mockedService.addNote.mockResolvedValue(makeNote({ channel: 'interna' }));
    render(<ProjectNotesSection project={makeProject()} profiles={profiles} />);

    await screen.findByText(/Nenhuma observação ainda/);
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: 'subiu a v2' } });
    fireEvent.click(screen.getByRole('button', { name: /Comunicação interna/ }));

    await waitFor(() =>
      expect(mockedService.addNote).toHaveBeenCalledWith('p1', 'u1', 'subiu a v2', {
        channel: 'interna',
      }),
    );
  });

  it('bloqueia Aprovação quando o projeto não tem telefone do cliente', async () => {
    mockedService.fetchNotes.mockResolvedValue([]);
    render(
      <ProjectNotesSection project={makeProject({ client_phone: '' })} profiles={profiles} />,
    );

    await screen.findByText(/Nenhuma observação ainda/);
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: 'aprova?' } });
    expect(screen.getByRole('button', { name: /Aprovação/ })).toBeDisabled();
  });

  it('só libera o envio de Reunião depois de a sala existir', async () => {
    mockedService.fetchNotes.mockResolvedValue([]);
    render(<ProjectNotesSection project={makeProject()} profiles={profiles} />);

    await screen.findByText(/Nenhuma observação ainda/);
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: 'vamos falar' } });
    // Texto preenchido, mas sem reunião agendada: o canal continua fechado.
    expect(screen.getByRole('button', { name: /^Reunião/ })).toBeDisabled();
  });

  it('avisa quando o cliente nunca escreveu — sem bloquear o envio', async () => {
    mockedService.fetchNotes.mockResolvedValue([]);
    mockedService.fetchContactStatus.mockResolvedValue({
      hasConversation: false,
      hasInbound: false,
      conversationId: null,
    });
    render(<ProjectNotesSection project={makeProject()} profiles={profiles} />);

    expect(await screen.findByText(/nunca te mandou mensagem/)).toBeInTheDocument();
    // O aviso é aviso: com texto escrito, a Aprovação continua clicável.
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: 'aprova?' } });
    expect(screen.getByRole('button', { name: /Aprovação/ })).toBeEnabled();
  });

  it('não avisa quando o cliente já conversou', async () => {
    mockedService.fetchNotes.mockResolvedValue([]);
    render(<ProjectNotesSection project={makeProject()} profiles={profiles} />);

    await screen.findByText(/Nenhuma observação ainda/);
    await waitFor(() => expect(mockedService.fetchContactStatus).toHaveBeenCalled());
    expect(screen.queryByText(/nunca te mandou mensagem/)).toBeNull();
  });

  it('não avisa sem telefone cadastrado — nem consulta o backend à toa', async () => {
    mockedService.fetchNotes.mockResolvedValue([]);
    render(
      <ProjectNotesSection project={makeProject({ client_phone: '' })} profiles={profiles} />,
    );

    await screen.findByText(/Nenhuma observação ainda/);
    expect(screen.queryByText(/nunca te mandou mensagem/)).toBeNull();
    expect(mockedService.fetchContactStatus).not.toHaveBeenCalled();
  });

  it('mostra a falha de entrega sem esconder a observação', async () => {
    mockedService.fetchNotes.mockResolvedValue([
      makeNote({
        channel: 'aprovacao',
        delivery: { aprovacao: { ok: false, error: 'WhatsApp desconectado' } },
      }),
    ]);
    render(<ProjectNotesSection project={makeProject()} profiles={profiles} />);

    expect(await screen.findByText('Primeira observação')).toBeInTheDocument();
    expect(screen.getByText(/falhou ao cliente: WhatsApp desconectado/)).toBeInTheDocument();
  });
});
