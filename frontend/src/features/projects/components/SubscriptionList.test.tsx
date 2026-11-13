import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SubscriptionList } from './SubscriptionList';
import {
  fetchSubscriptionPayments,
  registerSubscriptionPaymentOutside,
  registerSubscriptionPaymentManual,
  cancelSubscriptionPayment,
} from '../services/projectsService';
import type { BoardProject } from '../services/projectsService';
import type { SubscriptionPaymentRow } from '../../../lib/supabase/database.types';
import * as financeService from '../../finance/financeService';
import type { CardAuthorizationSummary, ProjectFinance } from '../../finance/financeService';

vi.mock('../services/projectsService', () => ({
  fetchSubscriptionPayments: vi.fn(),
  registerSubscriptionPaymentOutside: vi.fn(),
  registerSubscriptionPaymentManual: vi.fn(),
  cancelSubscriptionPayment: vi.fn(),
}));
vi.mock('../../finance/financeService', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../finance/financeService')>(),
  fetchProjectFinance: vi.fn(),
  saveSubscription: vi.fn(),
  subscriptionAction: vi.fn(),
  fetchProjectCardAuthorization: vi.fn(),
  createProjectCardAuthorizationLink: vi.fn(),
  configureProjectRecurringBilling: vi.fn(),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const mockedFetchPayments = vi.mocked(fetchSubscriptionPayments);
const mockedRegisterOutside = vi.mocked(registerSubscriptionPaymentOutside);
const mockedRegisterManual = vi.mocked(registerSubscriptionPaymentManual);
const mockedCancelPayment = vi.mocked(cancelSubscriptionPayment);
const mockedFetchFinance = vi.mocked(financeService.fetchProjectFinance);
const mockedSaveSubscription = vi.mocked(financeService.saveSubscription);
const mockedSubscriptionAction = vi.mocked(financeService.subscriptionAction);
const mockedFetchAuthorization = vi.mocked(financeService.fetchProjectCardAuthorization);
const mockedCreateAuthorizationLink = vi.mocked(financeService.createProjectCardAuthorizationLink);
const mockedConfigureRecurringBilling = vi.mocked(financeService.configureProjectRecurringBilling);

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

function makeAuthorization(over: Partial<CardAuthorizationSummary> = {}): CardAuthorizationSummary {
  return {
    authorization: {
      id: 'authorization-1', status: 'authorized', card_brand: 'VISA', card_last_four: '4242',
      authorized_at: '2026-08-01T00:00:00Z', authorized_limit_cents: 29990,
      term_version: 'v1', revoked_at: null,
    },
    authorizationCurrent: true,
    linkRequired: false,
    latestLink: null,
    linkIssue: null,
    nextCharge: null,
    sandboxOnly: true,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedFetchPayments.mockResolvedValue([]);
  mockedRegisterManual.mockResolvedValue({ paymentId: 'manual-payment-1' });
  mockedFetchFinance.mockResolvedValue(makeFinance(makeProject()));
  mockedSaveSubscription.mockResolvedValue({ subscriptionId: 'subscription-1', queued: true });
  mockedSubscriptionAction.mockResolvedValue({ queued: true });
  mockedFetchAuthorization.mockResolvedValue(makeAuthorization());
  mockedCreateAuthorizationLink.mockResolvedValue({
    url: 'https://painel.tenka.com/autorizar-cobrancas/link-seguro',
    expiresAt: '2026-08-02T00:00:00Z',
  });
  mockedConfigureRecurringBilling.mockResolvedValue({
    billing: { dueDay: 10, billingType: 'CREDIT_CARD' }, rebasedServiceCount: 0,
  });
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
    expect(screen.getByText('R$ 359,80')).toBeInTheDocument();
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
    expect(screen.getAllByText('R$ 299,90')).toHaveLength(2);
    expect(screen.getByText(/R\$ 299,90\/mês inativo nesta competência/)).toBeInTheDocument();
  });

  it('mostra inativa antes do primeiro vencimento e ativa no mês inicial', async () => {
    const project = makeProject({ name: 'Enzo Cortes', monthly_fee_cents: 5000,
      subscription_first_due_date: '2026-11-26' });
    const { rerender } = render(<SubscriptionList projects={[project]} isAdmin
      competence="2026-10" competenceLabel="Outubro de 2026" onChanged={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Sem cobrança')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Gerenciar mensalidade inativa de Enzo Cortes' })).toBeInTheDocument();
    expect(screen.getByText('Total ativo · 0 de 1')).toBeInTheDocument();
    rerender(<SubscriptionList projects={[project]} isAdmin
      competence="2026-11" competenceLabel="Novembro de 2026" onChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Gerenciar mensalidade ativa de Enzo Cortes' })).toBeInTheDocument();
    expect(screen.getByText('Total ativo · 1 de 1')).toBeInTheDocument();
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

    expect(screen.getByText('R$ 359,80')).toBeInTheDocument();
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
    const finance = makeFinance(project, 'inactive');
    finance.subscription!.next_due_date = '2026-12-10';
    mockedFetchFinance.mockResolvedValue(finance);
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
      nextDueDate: '2026-12-10',
      activate: true,
    }));
  });

  it('envia para o backend o mês de início escolhido na ativação', async () => {
    const project = makeProject({ id: 'b', subscription_active: false });
    const finance = makeFinance(project, 'inactive');
    finance.subscription!.next_due_date = '2026-10-10';
    mockedFetchFinance.mockResolvedValue(finance);
    render(
      <SubscriptionList {...defaultProps} projects={[project]} isAdmin onChanged={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Gerenciar mensalidade inativa/i }));
    expect(await screen.findByRole('heading', { name: 'Reativar mensalidade?' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Mês de início')).toHaveValue('2026-10'));
    fireEvent.change(screen.getByLabelText('Mês de início'), { target: { value: '2026-12' } });
    expect(screen.getByLabelText('Mês de início')).toHaveValue('2026-12');
    fireEvent.click(screen.getByRole('button', { name: 'Sim, reativar' }));

    await waitFor(() => expect(mockedSaveSubscription).toHaveBeenCalledWith('b', expect.objectContaining({
      nextDueDate: '2026-12-10',
      activate: true,
    })));
  });

  it('avisa quando o mês escolhido já passou e oferece o próximo ciclo', async () => {
    const project = makeProject({ id: 'b', subscription_active: false });
    const finance = makeFinance(project, 'inactive');
    finance.subscription!.next_due_date = '2026-09-10';
    mockedFetchFinance.mockResolvedValue(finance);
    render(
      <SubscriptionList {...defaultProps} projects={[project]} isAdmin onChanged={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Gerenciar mensalidade inativa/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/vencimento de 10\/09\/2026 já passou/i);
    expect(screen.getByRole('button', { name: 'Sim, reativar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Usar próximo ciclo' }));

    expect(screen.getByLabelText('Mês de início')).not.toHaveValue('2026-09');
    expect(screen.getByRole('button', { name: 'Sim, reativar' })).not.toBeDisabled();
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

  it('abre o mesmo projeto ao clicar no nome do projeto ou do cliente', () => {
    const project = makeProject({ id: 'a', name: 'Refribrás', client_name: 'Enzo Cortes' });
    const onOpenProject = vi.fn();
    render(<SubscriptionList {...defaultProps} projects={[project]} isAdmin
      onChanged={vi.fn()} onOpenProject={onOpenProject} />);

    fireEvent.click(screen.getByRole('button', { name: 'Refribrás' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enzo Cortes' }));
    expect(onOpenProject).toHaveBeenNthCalledWith(1, project);
    expect(onOpenProject).toHaveBeenNthCalledWith(2, project);
  });

  it('muda o valor previsto por competência e detalha a composição do mês', async () => {
    const project = makeProject({
      id: 'enzo', name: 'Enzo Cortes', monthly_fee_cents: 5000,
      subscription_first_due_date: '2026-11-26',
    });
    const services = [{
      id: 'domain', project_id: 'enzo', name: 'Domínio', amount_cents: 4000,
      frequency: 'annual' as const, first_due_date: '2026-12-26', status: 'draft' as const,
    }];
    const { rerender } = render(<SubscriptionList projects={[project]} services={services} isAdmin
      competence="2026-11" competenceLabel="Novembro de 2026" onChanged={vi.fn()} />);

    const november = screen.getByRole('button', { name: 'Enzo Cortes' }).closest('li')!;
    expect(november.textContent?.replace(/ /g, ' ')).toContain('R$ 50,00');
    expect(screen.queryByRole('button', { name: 'Ver composição — Enzo Cortes' })).toBeNull();

    rerender(<SubscriptionList projects={[project]} services={services} isAdmin
      competence="2026-12" competenceLabel="Dezembro de 2026" onChanged={vi.fn()} />);
    const december = screen.getByRole('button', { name: 'Enzo Cortes' }).closest('li')!;
    expect(december.textContent?.replace(/ /g, ' ')).toContain('R$ 90,00');

    fireEvent.click(screen.getByRole('button', { name: 'Ver composição — Enzo Cortes' }));
    const breakdown = screen.getByRole('list', { name: 'Composição de Enzo Cortes em Dezembro de 2026' });
    expect(within(breakdown).getByText('Hospedagem mensal')).toBeInTheDocument();
    expect(within(breakdown).getByText('Domínio')).toBeInTheDocument();
    expect(within(breakdown).getByText(/Anual · Aguardando autorização/i)).toBeInTheDocument();
  });

  it('prepara automaticamente o link quando o cartão ainda não foi autorizado', async () => {
    mockedFetchAuthorization
      .mockResolvedValueOnce(makeAuthorization({
        authorization: null, authorizationCurrent: false, linkRequired: true,
      }))
      .mockResolvedValueOnce(makeAuthorization({
        authorization: null, authorizationCurrent: false, linkRequired: true,
        latestLink: {
          id: 'link-1', status: 'active', state: 'active',
          expires_at: '2026-08-02T00:00:00Z', created_at: '2026-08-01T00:00:00Z',
          url: 'https://painel.tenka.com/autorizar-cobrancas/link-seguro',
        },
      }));
    render(<SubscriptionList {...defaultProps} projects={[makeProject({ id: 'a' })]}
      isAdmin onChanged={vi.fn()} />);

    expect(await screen.findByText('Aguardando autorização')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar autorização' })).toBeInTheDocument();
    expect(mockedCreateAuthorizationLink).toHaveBeenCalledWith('a');
  });

  it('aproveita o vencimento da mensalidade ativa para completar a configuração do cartão', async () => {
    mockedFetchAuthorization
      .mockResolvedValueOnce(makeAuthorization({
        authorization: null, authorizationCurrent: false, linkRequired: false,
        linkIssue: 'cobranca-recorrente-nao-configurada',
      }))
      .mockResolvedValueOnce(makeAuthorization({
        authorization: null, authorizationCurrent: false, linkRequired: true,
      }))
      .mockResolvedValueOnce(makeAuthorization({
        authorization: null, authorizationCurrent: false, linkRequired: true,
        latestLink: {
          id: 'link-1', status: 'active', state: 'active',
          expires_at: '2026-08-02T00:00:00Z', created_at: '2026-08-01T00:00:00Z',
          url: 'https://painel.tenka.com/autorizar-cobrancas/link-seguro',
        },
      }));
    render(<SubscriptionList {...defaultProps} projects={[makeProject({ id: 'a', due_day: 10 })]}
      isAdmin onChanged={vi.fn()} />);

    expect(await screen.findByText('Aguardando autorização')).toBeInTheDocument();
    expect(mockedConfigureRecurringBilling).toHaveBeenCalledWith('a', {
      dueDay: 10, billingType: 'CREDIT_CARD',
    });
    expect(mockedCreateAuthorizationLink).toHaveBeenCalledWith('a');
  });

  it('não chama falha de consulta de cartão de não configurado', async () => {
    mockedFetchAuthorization.mockRejectedValueOnce(new Error('offline'));
    render(<SubscriptionList {...defaultProps} projects={[makeProject({ id: 'a' })]}
      isAdmin onChanged={vi.fn()} />);

    expect(await screen.findByText('Consulta indisponível')).toBeInTheDocument();
    expect(screen.queryByText('Não configurado')).toBeNull();
  });

  it('depois da autorização mostra o status da cobrança sem repetir link de pagamento', async () => {
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
    expect(screen.queryByRole('link', { name: 'Abrir cobrança' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copiar link' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Marcar como pago/ })).toBeNull();
  });

  it('registra pagamento por fora no Asaas e aguarda o webhook', async () => {
    mockedFetchPayments.mockResolvedValue([makePayment()]);
    mockedRegisterOutside.mockResolvedValue({ queued: true, intentId: 'intent-1', awaitingWebhook: true });
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[makeProject({ id: 'a', name: 'Refibras' })]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar pagamento por fora' }));
    expect(await screen.findByRole('heading', { name: 'Registrar pagamento por fora' }))
      .toBeInTheDocument();
    expect(mockedRegisterOutside).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    await waitFor(() => expect(mockedRegisterOutside).toHaveBeenCalledWith(
      'subscription-payment-1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ));
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('oferece registro manual de pagamento recebido quando a competência não tem cobrança do Asaas', async () => {
    mockedFetchPayments.mockResolvedValue([]);
    render(
      <SubscriptionList
        {...defaultProps}
        projects={[makeProject({ id: 'a', name: '847 Vidros', monthly_fee_cents: 84700 })]}
        isAdmin
        onChanged={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar pagamento recebido — 847 Vidros' }));
    expect(await screen.findByRole('heading', { name: 'Registrar pagamento recebido' }))
      .toBeInTheDocument();
    expect(screen.getByText('Competência selecionada')).toBeInTheDocument();
    expect(screen.getByText(/Este registro paga somente Agosto de 2026/)).toBeInTheDocument();
    expect(screen.getByLabelText('Observação do pagamento')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Observação do pagamento'), {
      target: { value: 'Transferência para conta PJ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }));

    await waitFor(() => expect(mockedRegisterManual).toHaveBeenCalledWith(
      'a', '2026-08', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 'Transferência para conta PJ',
    ));
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
    expect(screen.queryByRole('button', { name: /Registrar pagamento recebido/ })).toBeNull();
  });

  it('mantém cobranças duplicadas visíveis e cancela pelo id exato', async () => {
    mockedFetchPayments.mockResolvedValue([
      makePayment({ id: 'subscription-payment-1', payment_url: 'https://asaas.test/pay_1' }),
      makePayment({ id: 'subscription-payment-2', payment_url: 'https://asaas.test/pay_2' }),
    ]);
    mockedCancelPayment.mockResolvedValue({ queued: true });
    render(<SubscriptionList {...defaultProps}
      projects={[makeProject({ id: 'a', name: 'Refibras' })]} isAdmin onChanged={vi.fn()} />);

    expect(await screen.findAllByText(/Cobrança [12]/)).toHaveLength(2);
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancelar cobrança mensal' });
    fireEvent.click(cancelButtons[1]);
    fireEvent.change(await screen.findByLabelText('Motivo do cancelamento'), {
      target: { value: 'Cobrança duplicada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar cobrança' }));
    await waitFor(() => expect(mockedCancelPayment).toHaveBeenCalledWith(
      'subscription-payment-2', 'Cobrança duplicada',
    ));
  });
});
