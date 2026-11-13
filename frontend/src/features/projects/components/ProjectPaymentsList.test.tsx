import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectPaymentRow } from '../../../lib/supabase/database.types';
import * as finance from '../../finance/financeService';
import { ProjectPaymentsList } from './ProjectPaymentsList';

vi.mock('../../finance/financeService', () => ({
  fetchFinanceOverview: vi.fn(),
  fetchProjectFinance: vi.fn(),
  savePaymentPlan: vi.fn(),
  savePaymentPlanDraft: vi.fn(),
  setDefaultProjectPayment: vi.fn(),
  updateProjectPayment: vi.fn(),
  createProjectCharge: vi.fn(),
  previewConsolidatedProjectCharge: vi.fn(),
  createConsolidatedProjectCharge: vi.fn(),
  createDefaultProjectCharge: vi.fn(),
  cancelProjectCharge: vi.fn(),
  cancelProjectCheckout: vi.fn(),
  registerProjectPaymentOutside: vi.fn(),
  markCancelledProjectPaymentPaid: vi.fn(),
  regenerateCancelledProjectCheckout: vi.fn(),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const fetchOverview = vi.mocked(finance.fetchFinanceOverview);
const setDefaultPayment = vi.mocked(finance.setDefaultProjectPayment);
const updatePayment = vi.mocked(finance.updateProjectPayment);
const createCharge = vi.mocked(finance.createProjectCharge);
const previewConsolidatedCharge = vi.mocked(finance.previewConsolidatedProjectCharge);
const createConsolidatedCharge = vi.mocked(finance.createConsolidatedProjectCharge);
const createDefaultCharge = vi.mocked(finance.createDefaultProjectCharge);
const cancelCharge = vi.mocked(finance.cancelProjectCharge);
const cancelCheckout = vi.mocked(finance.cancelProjectCheckout);
const registerOutside = vi.mocked(finance.registerProjectPaymentOutside);
const markCancelledPaid = vi.mocked(finance.markCancelledProjectPaymentPaid);
const regenerateCancelled = vi.mocked(finance.regenerateCancelledProjectCheckout);

const payment = (over: Partial<ProjectPaymentRow> = {}): ProjectPaymentRow => ({
  id: 'payment-1',
  project_id: 'project-1',
  name: 'Pagamento do projeto',
  description: '',
  amount_cents: 250000,
  due_date: '2026-09-20',
  paid_at: null,
  status: 'pending',
  position: 0,
  notes: '',
  receipt_url: '',
  kind: 'stage',
  installment_group_id: null,
  installment_number: null,
  installment_count: null,
  group_label: '',
  asaas_payment_id: null,
  external_reference: null,
  payment_url: '',
  bank_slip_url: '',
  pix_payload: '',
  billing_type: 'UNDEFINED',
  provider_status: null,
  sync_status: 'local',
  sync_error: null,
  payment_date: null,
  provider_event_at: null,
  project_name: 'Site Braslar',
  client_name: 'Braslar',
  project_value_cents: 250000,
  ...over,
});

const overview = (projectPayments: ProjectPaymentRow[]): finance.FinanceOverview => ({
  configured: true,
  environment: 'production',
  subscriptions: [],
  subscriptionPayments: [],
  projectPayments,
});

beforeEach(() => {
  vi.clearAllMocks();
  setDefaultPayment.mockResolvedValue({
    payment: payment({ virtual: false, status: 'paid' }),
    queued: false, billingIssue: null, dueDate: null,
  });
  updatePayment.mockResolvedValue({ payment: payment({ status: 'paid' }) });
  previewConsolidatedCharge.mockResolvedValue({
    client: { id: 'client-1', name: 'Braslar', cpfCnpj: '12345678901', hasDocument: true },
    target: { kind: 'project_payment', id: 'payment-1' },
    items: [{
      kind: 'project_payment',
      id: 'payment-1',
      project_id: 'project-1',
      project_name: 'Site Braslar',
      client_name: 'Braslar',
      label: 'Site Braslar - Pagamento do projeto',
      amount_cents: 250000,
      due_date: '2026-09-20',
      status: 'pending',
      source: 'local',
      asaas_payment_id: null,
      payment_url: '',
      billing_type: 'UNDEFINED',
      already_in_batch: false,
      is_target: true,
    }],
    totalCents: 250000,
  });
  createCharge.mockResolvedValue({ queued: true, dueDate: '2026-09-20' });
  createConsolidatedCharge.mockResolvedValue({
    queued: true, batchId: 'batch-1', amountCents: 300000, itemCount: 2,
  });
  createDefaultCharge.mockResolvedValue({
    payment: payment({ virtual: false, due_date: '2026-09-09', sync_status: 'queued' }),
    queued: true, billingIssue: null, dueDate: '2026-09-09',
  });
  registerOutside.mockResolvedValue({ queued: true, intentId: 'intent-1', awaitingWebhook: true });
  markCancelledPaid.mockResolvedValue({ payment: payment({ status: 'paid' }) });
  regenerateCancelled.mockResolvedValue({ queued: true, dueDate: '2026-11-11' });
  cancelCharge.mockResolvedValue({ queued: true });
  cancelCheckout.mockResolvedValue({ cancelled: true, readyForEdit: false });
});

describe('ProjectPaymentsList', () => {
  it('exibe projeto sem plano com ações rápidas e materializa o pagamento ao confirmar', async () => {
    fetchOverview.mockResolvedValue(overview([payment({ id: 'virtual:project-1', virtual: true, due_date: null })]));
    render(<ProjectPaymentsList isAdmin />);

    const button = await screen.findByRole('button', {
      name: 'Marcar como pago — Site Braslar',
    });
    const row = screen.getByText('Site Braslar').closest('li') as HTMLElement;
    expect(within(row).getByText('Pendente')).toBeInTheDocument();
    expect(within(row).getByText('R$ 2.500,00')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Adicionar data' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Dividir valor — Site Braslar' })).toBeInTheDocument();

    fireEvent.click(button);
    expect(await screen.findByRole('heading', { name: 'Marcar como pago' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como pago' }));
    await waitFor(() => expect(setDefaultPayment).toHaveBeenCalledWith(
      'project-1', true, undefined, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ));
  });

  it('recolhe as etapas, permite adicionar outra e mantém a etapa paga imutável', async () => {
    fetchOverview.mockResolvedValue(overview([
      payment({ id: 'stage-1', name: 'Entrada', amount_cents: 100000, status: 'paid' }),
      payment({ id: 'stage-2', name: 'Entrega', amount_cents: 150000, position: 1 }),
    ]));
    render(<ProjectPaymentsList isAdmin />);

    const expand = await screen.findByRole('button', { name: 'Ver etapas — Site Braslar' });
    expect(screen.getByRole('button', { name: 'Adicionar etapa — Site Braslar' })).toBeEnabled();
    expect(screen.queryByText('Entrada')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como pago — Site Braslar' })).not.toBeInTheDocument();
    fireEvent.click(expand);
    expect(await screen.findByText('Entrada')).toBeInTheDocument();
    expect(screen.getByText('Entrega')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Reabrir pagamento/ })).toBeNull();
  });

  it('adiciona uma data sem marcar o pagamento como pago', async () => {
    fetchOverview.mockResolvedValue(overview([payment({ id: 'virtual:project-1', virtual: true, due_date: null })]));
    render(<ProjectPaymentsList isAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar data' }));
    fireEvent.change(screen.getByLabelText('Data — Pagamento do projeto'), { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar data — Pagamento do projeto' }));

    await waitFor(() => expect(setDefaultPayment).toHaveBeenCalledWith('project-1', false, '2026-10-15'));
  });

  it('gera cobrança para pagamento local pendente com vencimento', async () => {
    fetchOverview.mockResolvedValue(overview([payment()]));
    render(<ProjectPaymentsList isAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: 'Gerar cobrança — Site Braslar' }));

    await waitFor(() => expect(createCharge).toHaveBeenCalledWith('payment-1'));
    expect(updatePayment).not.toHaveBeenCalled();
  });

  it('gera Checkout sem exigir vencimento e informa as formas disponíveis', async () => {
    fetchOverview.mockResolvedValue(overview([payment({ due_date: null })]));
    render(<ProjectPaymentsList isAdmin />);

    const button = await screen.findByRole('button', { name: 'Gerar cobrança — Site Braslar' });
    expect(button).toHaveAttribute('title', expect.stringContaining('Pix à vista ou cartão em até 6x'));
    fireEvent.click(button);

    await waitFor(() => expect(createCharge).toHaveBeenCalledWith('payment-1'));
  });

  it('gera o Checkout individual mesmo quando há outras pendências do cliente', async () => {
    previewConsolidatedCharge.mockResolvedValue({
      client: { id: 'client-1', name: 'Braslar', cpfCnpj: '12345678901', hasDocument: true },
      target: { kind: 'project_payment', id: 'payment-1' },
      items: [
        {
          kind: 'project_payment',
          id: 'payment-1',
          project_id: 'project-1',
          project_name: 'Site Braslar',
          client_name: 'Braslar',
          label: 'Site Braslar - Pagamento do projeto',
          amount_cents: 250000,
          due_date: '2026-09-20',
          status: 'pending',
          source: 'local',
          asaas_payment_id: null,
          payment_url: '',
          billing_type: 'UNDEFINED',
          already_in_batch: false,
          is_target: true,
        },
        {
          kind: 'subscription',
          id: '11111111-1111-4111-8111-111111111111',
          project_id: 'project-2',
          project_name: 'Retainer Braslar',
          client_name: 'Braslar',
          label: 'Retainer Braslar - mensalidade 08/2026',
          amount_cents: 50000,
          due_date: '2026-08-20',
          status: 'overdue',
          source: 'asaas',
          asaas_payment_id: 'pay_old',
          payment_url: 'https://sandbox.asaas.com/i/pay_old',
          billing_type: 'PIX',
          already_in_batch: false,
          is_target: false,
        },
      ],
      totalCents: 300000,
    });
    fetchOverview.mockResolvedValue(overview([payment()]));
    render(<ProjectPaymentsList isAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: 'Gerar cobrança — Site Braslar' }));

    await waitFor(() => expect(createCharge).toHaveBeenCalledWith('payment-1'));
    expect(previewConsolidatedCharge).not.toHaveBeenCalled();
    expect(createConsolidatedCharge).not.toHaveBeenCalled();
  });

  it('materializa o pagamento único e gera a cobrança quando ainda é virtual', async () => {
    fetchOverview.mockResolvedValue(overview([
      payment({ id: 'virtual:project-1', virtual: true, due_date: null }),
    ]));
    render(<ProjectPaymentsList isAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: 'Gerar cobrança — Site Braslar' }));

    await waitFor(() => expect(createDefaultCharge).toHaveBeenCalledWith('project-1'));
    expect(createCharge).not.toHaveBeenCalled();
  });

  it('identifica parcela programada e etapa sem vencimento', async () => {
    fetchOverview.mockResolvedValue(overview([
      payment({ id: 'stage-1', name: 'Entrega', due_date: null }),
      payment({
        id: 'installment-1', name: 'Parcela 1/1', position: 1, kind: 'installment',
        due_date: '2026-10-20', installment_group_id: '11111111-1111-4111-8111-111111111111',
        installment_number: 1, installment_count: 1, group_label: 'Restante',
      }),
    ]));
    render(<ProjectPaymentsList isAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: 'Ver etapas — Site Braslar' }));
    expect(screen.getByText('Etapa sem vencimento')).toBeInTheDocument();
    expect(screen.getByText('Parcela programada')).toBeInTheDocument();
  });

  it('não permite baixa direta em cobrança sincronizada e aguarda o webhook do Asaas', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fetchOverview.mockResolvedValue(overview([payment({
      sync_status: 'synced',
      asaas_payment_id: 'pay_asaas_1',
      payment_url: 'https://sandbox.asaas.com/i/pay_asaas_1',
    })]));
    render(<ProjectPaymentsList isAdmin />);

    expect(await screen.findByRole('link', { name: 'Abrir cobrança — Site Braslar' })).toHaveAttribute(
      'href', 'https://sandbox.asaas.com/i/pay_asaas_1',
    );
    expect(screen.getByRole('button', { name: 'Copiar link — Site Braslar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar cobrança — Site Braslar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como pago — Site Braslar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento por fora — Site Braslar' }));

    // O modal existe justamente para a baixa não sair no primeiro clique.
    expect(await screen.findByRole('heading', { name: 'Registrar pagamento por fora' }))
      .toBeInTheDocument();
    expect(registerOutside).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    await waitFor(() => expect(registerOutside).toHaveBeenCalledWith(
      'payment-1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ));
    expect(updatePayment).not.toHaveBeenCalled();
  });

  it('desiste da baixa manual quando a confirmação é cancelada', async () => {
    fetchOverview.mockResolvedValue(overview([payment({
      sync_status: 'synced', asaas_payment_id: 'pay_asaas_1',
      payment_url: 'https://sandbox.asaas.com/i/pay_asaas_1',
    })]));
    render(<ProjectPaymentsList isAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar pagamento por fora — Site Braslar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(
      screen.queryByRole('heading', { name: 'Registrar pagamento por fora' }),
    ).toBeNull());
    expect(registerOutside).not.toHaveBeenCalled();
  });

  it('mostra que a cobrança está vencida no Asaas', async () => {
    fetchOverview.mockResolvedValue(overview([payment({
      sync_status: 'synced', asaas_payment_id: 'pay_asaas_1',
      payment_url: 'https://sandbox.asaas.com/i/pay_asaas_1',
      provider_status: 'OVERDUE',
    })]));
    render(<ProjectPaymentsList isAdmin />);

    expect(await screen.findByText('Vencida')).toBeInTheDocument();
  });

  it('oferece correção mesmo quando a sincronização falhou depois de criar a cobrança', async () => {
    fetchOverview.mockResolvedValue(overview([payment({
      sync_status: 'failed', asaas_payment_id: 'pay_asaas_1',
      payment_url: 'https://sandbox.asaas.com/i/pay_asaas_1',
      provider_status: 'OVERDUE', sync_error: 'Falha temporária',
    })]));
    render(<ProjectPaymentsList isAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir cobrança — Site Braslar' }));
    expect(screen.getByRole('heading', { name: 'Cancelar e corrigir cobrança' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Motivo da correção'), {
      target: { value: 'Pagamento renegociado em duas etapas' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar e abrir correção' }));

    await waitFor(() => expect(cancelCharge).toHaveBeenCalledWith(
      'payment-1', 'Pagamento renegociado em duas etapas', true,
    ));
  });

  it('pede para cancelar a cobrança existente antes de dividir o valor', async () => {
    fetchOverview.mockResolvedValue(overview([
      payment({
        id: 'payment-1', project_name: 'Ecoluz', project_value_cents: 70_000,
        amount_cents: 70_000, sync_status: 'failed', asaas_payment_id: 'pay_ecoluz',
        provider_status: 'OVERDUE', sync_error: 'Falha temporária',
      }),
      payment({
        id: 'payment-2', project_name: 'Ecoluz', project_value_cents: 70_000,
        name: 'Etapa 2', amount_cents: 35_000, position: 1, due_date: null,
        sync_status: 'local', asaas_payment_id: null, provider_status: null,
      }),
    ]));
    render(<ProjectPaymentsList isAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar etapa — Ecoluz' }));
    expect(screen.getByRole('heading', { name: 'Cancelar cobrança e dividir valor' }))
      .toBeInTheDocument();
    expect(screen.getAllByText(/R\$ 700,00/)).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Motivo da divisão'), {
      target: { value: 'Dividir em duas etapas' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar e dividir' }));

    await waitFor(() => expect(cancelCharge).toHaveBeenCalledWith(
      'payment-1', 'Dividir em duas etapas', true,
    ));
  });

  it('permite dar baixa local ou gerar novo Checkout para uma cobrança cancelada', async () => {
    fetchOverview.mockResolvedValue(overview([payment({
      status: 'cancelled', sync_status: 'synced', provider_status: 'DELETED',
      asaas_payment_id: 'pay_cancelled', project_name: 'Excelência Refrigeração',
    })]));
    render(<ProjectPaymentsList isAdmin />);

    fireEvent.click(await screen.findByRole('button', {
      name: 'Marcar cancelada como paga — Excelência Refrigeração',
    }));
    fireEvent.change(screen.getByLabelText('Motivo da baixa'), {
      target: { value: 'Cliente pagou por Pix' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como pago' }));
    await waitFor(() => expect(markCancelledPaid).toHaveBeenCalledWith(
      'payment-1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 'Cliente pagou por Pix',
    ));

    fetchOverview.mockResolvedValue(overview([payment({
      status: 'cancelled', sync_status: 'synced', provider_status: 'DELETED',
      asaas_payment_id: 'pay_cancelled', project_name: 'Excelência Refrigeração',
    })]));
    fireEvent.click(await screen.findByRole('button', {
      name: 'Gerar novo Checkout — Excelência Refrigeração',
    }));
    fireEvent.change(screen.getByLabelText('Motivo da nova cobrança'), {
      target: { value: 'Cliente solicitou novo link' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar novo Checkout' }));
    await waitFor(() => expect(regenerateCancelled).toHaveBeenCalledWith(
      'payment-1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      'Cliente solicitou novo link',
    ));
  });

  it('não oferece reabertura local para pagamento confirmado pelo Asaas', async () => {
    fetchOverview.mockResolvedValue(overview([payment({
      status: 'paid', sync_status: 'synced', provider_status: 'RECEIVED',
      asaas_payment_id: 'pay_received',
    })]));
    render(<ProjectPaymentsList isAdmin />);

    expect(await screen.findByText('Pago')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reabrir/ })).toBeNull();
  });

  it('retoma uma correção pendente sem permitir reemitir o valor antigo', async () => {
    const correction = payment({
      amount_cents: 70_000, due_date: null, sync_status: 'local',
      provider_status: 'CORRECTION_REQUIRED', project_name: 'Ecoluz',
      project_value_cents: 70_000,
    });
    fetchOverview.mockResolvedValue(overview([correction]));
    vi.mocked(finance.fetchProjectFinance).mockResolvedValue({
      configured: true, environment: 'production',
      project: { id: 'project-1', name: 'Ecoluz', value_cents: 70_000 } as finance.ProjectFinance['project'],
      subscription: null, projectPayments: [correction], subscriptionPayments: [], paymentPlanDraft: null,
    });
    render(<ProjectPaymentsList isAdmin />);

    expect(await screen.findByText('Correção pendente')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar cobrança — Ecoluz' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar valor e data — Ecoluz' }));

    expect(await screen.findByRole('heading', { name: 'Plano de pagamentos' })).toBeInTheDocument();
    expect(screen.getByText('Cobrança anterior cancelada.')).toBeInTheDocument();
  });
});
