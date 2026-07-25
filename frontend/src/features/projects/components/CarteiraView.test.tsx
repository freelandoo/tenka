import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CarteiraView } from './CarteiraView';
import { setSubscriptionActive } from '../services/projectsService';
import * as clientsService from '../../clients/clientsService';
import type { ProfileRow } from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';

vi.mock('../services/projectsService', () => ({ setSubscriptionActive: vi.fn() }));
vi.mock('../../clients/clientsService', () => ({
  fetchCosts: vi.fn(),
  createCost: vi.fn(),
  updateCost: vi.fn(),
  deleteCost: vi.fn(),
  sumActiveCosts: vi.fn(() => 0),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../../../lib/api/events', () => ({ subscribeRealtime: () => () => {} }));

const mockedToggle = vi.mocked(setSubscriptionActive);

/** O extrato só mostra projetos entregues no mês selecionado (hoje, por padrão). */
const hoje = new Date();
const dueDate = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-15`;

function makeProject(over: Partial<BoardProject> = {}): BoardProject {
  return {
    id: 'p1',
    name: 'tenka',
    description: '',
    value_cents: 250000,
    monthly_fee_cents: 90000,
    subscription_active: true,
    client_id: 'c1',
    client_name: 'Alex',
    client_phone: '11953375335',
    client_email: '',
    due_day: 10,
    company: 'tenka',
    due_date: dueDate,
    status: 'em_andamento',
    color_key: 'ciano',
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
  vi.mocked(clientsService).fetchCosts.mockResolvedValue([]);
});

describe('Extrato da Carteira', () => {
  it('expõe vencimento, valor e mensalidade na linha', async () => {
    render(
      <CarteiraView
        projects={[makeProject()]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={vi.fn()}
      />,
    );

    // "R$ 900,00/mês" também aparece no KPI de mensalidade acumulada — a
    // asserção precisa ser dentro da LINHA do extrato.
    await screen.findByText('dia 10');
    const linha = screen.getByText('tenka').closest('.cart-row') as HTMLElement;
    expect(within(linha).getByText('dia 10')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 900,00/mês')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 2.500,00')).toBeInTheDocument();
  });

  it('o botão alterna a recorrência da mensalidade', async () => {
    const onChanged = vi.fn();
    render(
      <CarteiraView
        projects={[makeProject()]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={onChanged}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Ativa/ }));
    await waitFor(() => expect(mockedToggle).toHaveBeenCalledWith('p1', false));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('colaborador vê o estado mas não altera', async () => {
    render(
      <CarteiraView
        projects={[makeProject()]}
        profiles={profiles}
        isAdmin={false}
        onProjectsChanged={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /Ativa/ })).toBeDisabled();
  });

  it('projeto sem mensalidade não mostra botão de recorrência', async () => {
    render(
      <CarteiraView
        projects={[makeProject({ monthly_fee_cents: 0, subscription_active: false })]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={vi.fn()}
      />,
    );

    await screen.findByText('dia 10');
    expect(screen.queryByRole('button', { name: /Ativa|Inativa/ })).toBeNull();
  });
});
