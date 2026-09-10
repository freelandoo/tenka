import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SubscriptionList } from './SubscriptionList';
import {
  fetchSubscriptionPayments,
  registerSubscriptionPaymentOutside,
} from '../services/projectsService';
import type { BoardProject } from '../services/projectsService';
import type { SubscriptionPaymentRow } from '../../../lib/supabase/database.types';
import * as financeService from '../../finance/financeService';
import type { ProjectFinance } from '../../finance/financeService';

vi.mock('../services/projectsService', () => ({
  fetchSubscriptionPayments: vi.fn(),
  registerSubscriptionPaymentOutside: vi.fn(),
}));
vi.mock('../../finance/financeService', () => ({
  fetchProjectFinance: vi.fn(),
  saveSubscription: vi.fn(),
  subscriptionAction: vi.fn(),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const mockedFetchPayments = vi.mocked(fetchSubscriptionPayments);
const mockedRegisterOutside = vi.mocked(registerSubscriptionPaymentOutside);
const mockedFetchFinance = vi.mocked(financeService.fetchProjectFinance);
const mockedSaveSubscription = vi.mocked(financeService.saveSubscription);
const mockedSubscriptionAction = vi.mocked(financeService.subscriptionAction);

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

function makePayment(over: Partial<SubscriptionPaymentRow> = {}): SubscriptionPaymentRow {
  return {
    id: 'subscription-payment-1',
    project_id: 'a',
    competence: '2026-08-01',
    amount_cents: 29990,
    due_date: '2026-08-10',
    status: 'pending',
    asaas_payment_id: 'pay_123',
    payment_url: 'https://sandbox.asaas.com/i/pay_123',
    billing_type: 'PIX',
    provider_status: 'PENDING',
    paid_at: null,
    source: 'asaas',
    payment_date: null,
    credit_date: null,
    client_payment_date: null,
    provider_event_at: null,
    net_amount_cents: null,
    original_due_date: null,
    bank_slip_url: '',
    pix_payload: '',
    ...over,
  };
}

function makeFinance(
  project: BoardProject,
  status: 'draft' | 'pending_activation' | 'active' | 'inactive' | 'cancelled' = 'active',
  asaasSubscriptionId: string | null = 'sub-1',
): ProjectFinance {
  return {
    configured: true,
    environment: 'sandbox',
    project: { ...project, cpf_cnpj: '12345678909' },
    subscription: {
      id: 'subscription-1', project_id: project.id, amount_cents: project.monthly_fee_cents,
      billing_type: 'PIX', due_day: project.due_day ?? 10, next_due_date: '2026-09-10',
      status, asaas_subscription_id: asaasSubscriptionId,
      external_reference: `project-subscription:${project.id}`, sync_error: null,
      created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z',
    },
    projectPayments: [],
    subscriptionPayments: [],
    paymentPlanDraft: null,
  } as ProjectFinance;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedFetchPayments.mockResolvedValue([]);
  mockedFetchFinance.mockResolvedValue(makeFinance(makeProject()));
  mockedSaveSubscription.mockResolvedValue({ subscriptionId: 'subscription-1', queued: true });
  mockedSubscriptionAction.mockResolvedValue({ queued: true });
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

  it('admin confirma a desativação e vê que cobranças emitidas serão preservadas', async () => {
    const project = makeProject({ id: 'a' });
    mockedFetchFinance.mockResolvedValue(makeFinance(project));
    const onChanged = vi.fn();
    render(
      <SubscriptionList {...defaultProps} projects={[project]} isAdmin onChanged={onChanged} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Gerenciar mensalidade ativa/i }));
    expect(await screen.findByRole('heading', { name: 'Desativar mensalidade?' })).toBeInTheDocument();
    expect(screen.getByText(/Cobranças já emitidas, inclusive pendentes ou vencidas/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, desativar' }));

    await waitFor(() => expect(mockedSubscriptionAction).toHaveBeenCalledWith('a', 'pause'));
    expect(onChanged).toHaveBeenCalled();
  });

  it('admin ativa uma mensalidade inativa somente após a confirmação', async () => {
    const project = makeProject({ id: 'b', subscription_active: false });
    mockedFetchFinance.mockResolvedValue(makeFinance(project, 'inactive'));
    render(
      <SubscriptionList {...defaultProps} projects={[project]} isAdmin onChanged={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Gerenciar mensalidade inativa/i }));
    expect(await screen.findByRole('heading', { name: 'Reativar mensalidade?' })).toBeInTheDocument();
    expect(screen.getByText(/histórico anterior permanece inalterado/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, reativar' }));

    await waitFor(() => expect(mockedSaveSubscription).toHaveBeenCalledWith('b', {
      amountCents: 29_990,
      dueDay: 10,
      activate: true,
    }));
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

    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ativa' })).toBeNull();
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

  it('mostra pendência como status e oferece acesso à cobrança sem baixa local', async () => {
    mockedFetchPayments.mockResolvedValue([makePayment()]);
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[makeProject({ id: 'a', name: 'Refibras' })]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByText('Pendente')).toBeInTheDocument();
    expect(mockedFetchPayments).toHaveBeenCalledWith('2026-08');
    expect(screen.getByRole('link', { name: 'Abrir cobrança' })).toHaveAttribute(
      'href', 'https://sandbox.asaas.com/i/pay_123',
    );
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar como pago/ })).toBeNull();
  });

  it('registra pagamento por fora no Asaas e aguarda o webhook', async () => {
    mockedFetchPayments.mockResolvedValue([makePayment()]);
    mockedRegisterOutside.mockResolvedValue({ submitted: true, awaitingWebhook: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[makeProject({ id: 'a', name: 'Refibras' })]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar pagamento por fora' }));
    await waitFor(() => expect(mockedRegisterOutside).toHaveBeenCalledWith(
      'a', '2026-08', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ));
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('não oferece baixa externa depois que o webhook confirma o recebimento', async () => {
    mockedFetchPayments.mockResolvedValue([makePayment({ status: 'received' })]);
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[makeProject({ id: 'a', name: 'Refibras' })]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByText('Recebido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar pagamento por fora' })).toBeNull();
  });
});
