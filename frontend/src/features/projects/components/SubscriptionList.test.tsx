import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SubscriptionList } from './SubscriptionList';
import {
  fetchSubscriptionPayments,
  setSubscriptionActive,
  setSubscriptionPaid,
} from '../services/projectsService';
import type { BoardProject } from '../services/projectsService';

vi.mock('../services/projectsService', () => ({
  fetchSubscriptionPayments: vi.fn(),
  setSubscriptionActive: vi.fn(),
  setSubscriptionPaid: vi.fn(),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const mockedToggle = vi.mocked(setSubscriptionActive);
const mockedFetchPayments = vi.mocked(fetchSubscriptionPayments);
const mockedSetPaid = vi.mocked(setSubscriptionPaid);

const defaultProps = {
  competence: '2026-08',
  competenceLabel: 'Agosto de 2026',
};

function makeProject(over: Partial<BoardProject> = {}): BoardProject {
  return {
    id: 'p1',
    name: 'Projeto',
    description: '',
    value_cents: 250000,
    monthly_fee_cents: 29990,
    subscription_active: true,
    client_id: 'c1',
    client_name: 'Cliente',
    client_phone: '',
    client_email: '',
    due_day: 10,
    company: 'tenka',
    due_date: '2026-03-28',
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

beforeEach(() => {
  vi.clearAllMocks();
  mockedFetchPayments.mockResolvedValue([]);
});

describe('SubscriptionList', () => {
  it('reúne mensalidades de qualquer mês — o motivo da seção existir', () => {
    // Entregas em março e em dezembro: o Extrato mostraria uma de cada vez.
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[
          makeProject({ id: 'a', name: 'Braslar', due_date: '2026-03-28' }),
          makeProject({ id: 'b', name: 'Cida', due_date: '2026-12-02', monthly_fee_cents: 5990 }),
        ]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByText('Braslar')).toBeInTheDocument();
    expect(screen.getByText('Cida')).toBeInTheDocument();
    expect(screen.getByText('Total ativo · 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('R$ 359,80/mês')).toBeInTheDocument();
  });

  it('ignora projeto sem mensalidade cadastrada', () => {
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[
          makeProject({ id: 'a', name: 'Com fee' }),
          makeProject({ id: 'b', name: 'Sem fee', monthly_fee_cents: 0 }),
        ]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByText('Com fee')).toBeInTheDocument();
    expect(screen.queryByText('Sem fee')).not.toBeInTheDocument();
    expect(screen.getByText('Total ativo · 1 de 1')).toBeInTheDocument();
  });

  it('mantém a desligada na lista, fora da soma, e mostra quanto está parado', () => {
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[
          makeProject({ id: 'a', name: 'Ativa' }),
          makeProject({ id: 'b', name: 'Parada', subscription_active: false }),
        ]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByText('Parada')).toBeInTheDocument();
    expect(screen.getByText('Total ativo · 1 de 2')).toBeInTheDocument();
    // Soma só a ativa; a desligada aparece como receita parada.
    expect(screen.getByText('R$ 299,90/mês')).toBeInTheDocument();
    expect(screen.getByText(/R\$ 299,90\/mês desligado/)).toBeInTheDocument();
  });

  it('soma centavos como número mesmo se a API mandar string (bug do bigint)', () => {
    // Guarda o defeito que exibia "R$ 1.499.059.901.499.030.200.000.000.000.000,00".
    const comoString = (v: unknown) => v as number;
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[
          makeProject({ id: 'a', monthly_fee_cents: comoString('29990') }),
          makeProject({ id: 'b', monthly_fee_cents: comoString('5990') }),
        ]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByText('R$ 359,80/mês')).toBeInTheDocument();
  });

  it('liga e desliga a recorrência', async () => {
    mockedToggle.mockResolvedValue(undefined);
    const onChanged = vi.fn();
    render(
      <SubscriptionList {...defaultProps} projects={[makeProject({ id: 'a' })]} isAdmin onChanged={onChanged} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ativa' }));
    await waitFor(() => expect(mockedToggle).toHaveBeenCalledWith('a', false));
    expect(onChanged).toHaveBeenCalled();
  });

  it('colaborador vê os valores mas não altera a recorrência', () => {
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[makeProject({ id: 'a' })]}
        isAdmin={false}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Ativa' })).toBeDisabled();
  });

  it('mostra o dia do vencimento e o cliente de cada mensalidade', () => {
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[makeProject({ id: 'a', due_day: 10, client_name: 'André Marcolino' })]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    const linha = screen.getByText('Projeto').closest('li') as HTMLElement;
    expect(within(linha).getByText('dia 10')).toBeInTheDocument();
    expect(within(linha).getByText('André Marcolino')).toBeInTheDocument();
  });

  it('confirma o pagamento na competência selecionada e permite desfazer', async () => {
    mockedFetchPayments.mockResolvedValue([]);
    mockedSetPaid.mockResolvedValue(undefined);
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[makeProject({ id: 'a', name: 'Refibras' })]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    const button = await screen.findByRole('button', {
      name: 'Marcar como pago — Refibras — Agosto de 2026',
    });
    expect(mockedFetchPayments).toHaveBeenCalledWith('2026-08');
    fireEvent.click(button);

    await waitFor(() => expect(mockedSetPaid).toHaveBeenCalledWith('a', '2026-08', true));
    expect(screen.getByRole('button', { name: 'Pago — Refibras — Agosto de 2026' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
