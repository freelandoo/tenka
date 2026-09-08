import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { CarteiraView } from './CarteiraView';
import * as clientsService from '../../clients/clientsService';
import type { ProfileRow } from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';

vi.mock('../services/projectsService', () => ({
  fetchSubscriptionPayments: vi.fn().mockResolvedValue([]),
  setSubscriptionPaid: vi.fn(),
}));
vi.mock('../../clients/clientsService', () => ({
  fetchCosts: vi.fn(),
  createCost: vi.fn(),
  updateCost: vi.fn(),
  deleteCost: vi.fn(),
  sumActiveCosts: vi.fn(() => 0),
}));
vi.mock('../../finance/financeService', () => ({
  fetchFinanceOverview: vi.fn().mockResolvedValue({
    configured: true,
    environment: 'production',
    subscriptions: [],
    subscriptionPayments: [],
    projectPayments: [],
  }),
  setDefaultProjectPayment: vi.fn(),
  updateProjectPayment: vi.fn(),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../../../lib/api/events', () => ({ subscribeRealtime: () => () => {} }));

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
  /**
   * O nome do projeto, "dia 10" e o botão de recorrência aparecem TAMBÉM na
   * seção Mensalidades, que lista as recorrências de todos os meses. Query
   * global aqui pegaria as duas — as asserções do Extrato moram na `.cart-row`.
   */
  const extratoRow = (container: HTMLElement) =>
    container.querySelector('.cart-row') as HTMLElement;

  it('expõe vencimento, valor e mensalidade na linha', async () => {
    const { container } = render(
      <CarteiraView
        projects={[makeProject()]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={vi.fn()}
      />,
    );

    await waitFor(() => expect(extratoRow(container)).toBeTruthy());
    const linha = extratoRow(container);
    expect(within(linha).getByText('dia 10')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 900,00/mês')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 2.500,00')).toBeInTheDocument();
  });

  it('mostra a recorrência sem atalho de ativação fora do financeiro administrativo', async () => {
    const { container } = render(
      <CarteiraView
        projects={[makeProject()]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={vi.fn()}
      />,
    );

    await waitFor(() => expect(extratoRow(container)).toBeTruthy());
    expect(within(extratoRow(container)).getByText('Ativa')).toBeInTheDocument();
    expect(within(extratoRow(container)).queryByRole('button', { name: /Ativa/ })).toBeNull();
  });

  it('colaborador vê o mesmo estado somente para leitura', async () => {
    const { container } = render(
      <CarteiraView
        projects={[makeProject()]}
        profiles={profiles}
        isAdmin={false}
        onProjectsChanged={vi.fn()}
      />,
    );

    await waitFor(() => expect(extratoRow(container)).toBeTruthy());
    expect(within(extratoRow(container)).getByText('Ativa')).toBeInTheDocument();
    expect(within(extratoRow(container)).queryByRole('button', { name: /Ativa/ })).toBeNull();
  });

  it('a seção Mensalidades mostra recorrência de projeto ENTREGUE em outro mês', async () => {
    // O Extrato só enxerga o mês selecionado; a recorrência de um projeto
    // entregue em outro mês só aparece porque a seção Mensalidades existe.
    const { container } = render(
      <CarteiraView
        projects={[makeProject({ name: 'Braslar', due_date: '2020-03-28' })]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={vi.fn()}
      />,
    );

    // Fora do mês corrente: nada no extrato...
    await waitFor(() => expect(screen.getByText(/Nenhuma entrega em/)).toBeInTheDocument());
    expect(container.querySelector('.cart-row')).toBeNull();

    // ...mas a mensalidade continua visível e somando, no painel ao lado.
    const linhaFee = container.querySelector('.fees__row') as HTMLElement;
    expect(within(linhaFee).getByText('Braslar')).toBeInTheDocument();
    // O "/mês" vive num <small>, e o Intl usa espaço não-quebrável no "R$ ".
    expect(linhaFee.textContent?.replace(/ /g, ' ')).toContain('R$ 900,00/mês');
    expect(screen.getByText('Total ativo · 1 de 1')).toBeInTheDocument();
  });

  it('custos, mensalidades e pagamentos de projetos ficam na mesma faixa', async () => {
    const { container } = render(
      <CarteiraView
        projects={[makeProject({ name: 'Braslar' })]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={vi.fn()}
      />,
    );

    // Os três painéis são irmãos dentro da faixa horizontal: dois ficam
    // visíveis por vez, e o terceiro é alcançado pelas setas ou pelo scroll.
    const grid = container.querySelector('.cart-recorrencias') as HTMLElement;
    expect(grid).toBeTruthy();
    const paineis = grid.querySelectorAll(':scope > .cart-panel');
    expect(paineis).toHaveLength(3);
    expect(paineis[0]).toHaveTextContent('Custo mensal');
    expect(paineis[1]).toHaveTextContent('Mensalidades');
    expect(paineis[2]).toHaveTextContent('Pagamentos dos projetos');

    // Ambas as listas visíveis ao mesmo tempo, sem clique.
    await waitFor(() =>
      expect(screen.getByText(/Nenhum custo da empresa lançado/)).toBeInTheDocument(),
    );
    expect(container.querySelector('.fees__row')).toBeTruthy();
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
