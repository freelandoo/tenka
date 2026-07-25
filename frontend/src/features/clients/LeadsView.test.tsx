import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeadsView } from './LeadsView';
import * as service from './clientsService';
import * as projectsService from '../projects/services/projectsService';
import type { ClientWithTotals, ProfileRow } from '../../lib/supabase/database.types';
import type { BoardProject } from '../projects/services/projectsService';

vi.mock('./clientsService', () => ({
  fetchClients: vi.fn(),
  fetchCosts: vi.fn(),
  createCost: vi.fn(),
  updateCost: vi.fn(),
  deleteCost: vi.fn(),
  updateClient: vi.fn(),
  sumActiveCosts: vi.fn(() => 0),
}));

vi.mock('../projects/services/projectsService', async (original) => ({
  ...(await original<typeof projectsService>()),
  setSubscriptionActive: vi.fn(),
}));

vi.mock('../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../../lib/api/events', () => ({ subscribeRealtime: () => () => {} }));

const mocked = vi.mocked(service);
const mockedProjects = vi.mocked(projectsService);

function makeClient(over: Partial<ClientWithTotals> = {}): ClientWithTotals {
  return {
    id: 'c1',
    name: 'Alex Rodrigues',
    phone: '(11) 98888-7777',
    email: 'alex@tenka.com',
    notes: '',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    archived_at: null,
    project_count: 2,
    total_value_cents: 500000,
    active_fee_cents: 90000,
    fee_count: 1,
    active_fee_count: 1,
    due_day: 10,
    ...over,
  };
}

function makeProject(over: Partial<BoardProject> = {}): BoardProject {
  return {
    id: 'p1',
    name: 'Projeto Tenka',
    description: '',
    value_cents: 250000,
    monthly_fee_cents: 90000,
    subscription_active: true,
    client_id: 'c1',
    client_name: 'Alex Rodrigues',
    client_phone: '(11) 98888-7777',
    client_email: 'alex@tenka.com',
    due_day: 10,
    company: 'tenka',
    due_date: '2026-10-01',
    status: 'inicio',
    color_key: 'amarelo',
    position: 0,
    finalized_at: null,
    created_by: 'u1',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    archived_at: null,
    assignees: [],
    ...over,
  } as BoardProject;
}

const profiles: ProfileRow[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  mocked.fetchCosts.mockResolvedValue([]);
});

describe('LeadsView', () => {
  it('mostra UMA linha por cliente, mesmo com dois projetos', async () => {
    // Era exatamente a queixa: o mesmo contato aparecia duas vezes.
    mocked.fetchClients.mockResolvedValue([makeClient()]);
    render(
      <LeadsView
        projects={[makeProject(), makeProject({ id: 'p2', name: 'Projeto Coliseu' })]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={vi.fn()}
      />,
    );

    expect(await screen.findAllByText('Alex Rodrigues')).toHaveLength(1);
    expect(screen.getByText('2 projetos')).toBeInTheDocument();
  });

  it('soma valor e mensalidade do cliente e mostra o vencimento', async () => {
    mocked.fetchClients.mockResolvedValue([makeClient()]);
    render(
      <LeadsView projects={[makeProject()]} profiles={profiles} isAdmin onProjectsChanged={vi.fn()} />,
    );

    await screen.findByText('2 projetos');
    expect(screen.getByText(/5\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/900,00\/mês/)).toBeInTheDocument();
    expect(screen.getByText('dia 10')).toBeInTheDocument();
  });

  it('com UM projeto com mensalidade, o botão Ativa alterna direto', async () => {
    mocked.fetchClients.mockResolvedValue([makeClient({ fee_count: 1, active_fee_count: 1 })]);
    const onChanged = vi.fn();
    render(
      <LeadsView
        projects={[makeProject()]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={onChanged}
      />,
    );

    const botao = await screen.findByRole('button', { name: 'Ativa' });
    fireEvent.click(botao);
    await waitFor(() =>
      expect(mockedProjects.setSubscriptionActive).toHaveBeenCalledWith('p1', false),
    );
  });

  it('com VÁRIOS projetos com mensalidade, mostra o placar em vez de alternar', async () => {
    // Alternar aqui seria ambíguo: qual dos dois? O controle certo é na ficha.
    mocked.fetchClients.mockResolvedValue([makeClient({ fee_count: 2, active_fee_count: 1 })]);
    render(
      <LeadsView
        projects={[makeProject(), makeProject({ id: 'p2' })]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={vi.fn()}
      />,
    );

    expect(await screen.findByText('1/2 ativas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ativa' })).toBeNull();
  });

  it('filtra pela busca de nome, telefone ou e-mail', async () => {
    mocked.fetchClients.mockResolvedValue([
      makeClient(),
      makeClient({ id: 'c2', name: 'Beta Ltda', phone: '', email: 'contato@beta.com' }),
    ]);
    render(
      <LeadsView projects={[]} profiles={profiles} isAdmin onProjectsChanged={vi.fn()} />,
    );

    await screen.findByText('Beta Ltda');
    fireEvent.change(screen.getByLabelText('Buscar clientes'), { target: { value: 'beta.com' } });
    expect(screen.getByText('Beta Ltda')).toBeInTheDocument();
    expect(screen.queryByText('Alex Rodrigues')).toBeNull();
  });
});
