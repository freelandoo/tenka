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

  it('o botão alterna a recorrência da mensalidade', async () => {
    const onChanged = vi.fn();
    const { container } = render(
      <CarteiraView
        projects={[makeProject()]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={onChanged}
      />,
    );

    await waitFor(() => expect(extratoRow(container)).toBeTruthy());
    fireEvent.click(within(extratoRow(container)).getByRole('button', { name: /Ativa/ }));
    await waitFor(() => expect(mockedToggle).toHaveBeenCalledWith('p1', false));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('colaborador vê o estado mas não altera', async () => {
    const { container } = render(
      <CarteiraView
        projects={[makeProject()]}
        profiles={profiles}
        isAdmin={false}
        onProjectsChanged={vi.fn()}
      />,
    );

    await waitFor(() => expect(extratoRow(container)).toBeTruthy());
    expect(
      within(extratoRow(container)).getByRole('button', { name: /Ativa/ }),
    ).toBeDisabled();
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

  it('custos e mensalidades ficam lado a lado, no mesmo grid', async () => {
    const { container } = render(
      <CarteiraView
        projects={[makeProject({ name: 'Braslar' })]}
        profiles={profiles}
        isAdmin
        onProjectsChanged={vi.fn()}
      />,
    );

    // Os dois painéis são irmãos dentro de .cart-recorrencias — é o que os
    // coloca em duas colunas em vez de empilhados.
    const grid = container.querySelector('.cart-recorrencias') as HTMLElement;
    expect(grid).toBeTruthy();
    const paineis = grid.querySelectorAll(':scope > .cart-panel');
    expect(paineis).toHaveLength(2);
    expect(paineis[0]).toHaveTextContent('Custo mensal');
    expect(paineis[1]).toHaveTextContent('Mensalidades');

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
