import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectPaymentRow } from '../../../lib/supabase/database.types';
import * as finance from '../../finance/financeService';
import { ProjectPaymentsList } from './ProjectPaymentsList';

vi.mock('../../finance/financeService', () => ({
  fetchFinanceOverview: vi.fn(),
  fetchProjectFinance: vi.fn(),
  savePaymentPlan: vi.fn(),
  setDefaultProjectPayment: vi.fn(),
  updateProjectPayment: vi.fn(),
  createProjectCharge: vi.fn(),
  cancelProjectCharge: vi.fn(),
  registerProjectPaymentOutside: vi.fn(),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const fetchOverview = vi.mocked(finance.fetchFinanceOverview);
const setDefaultPayment = vi.mocked(finance.setDefaultProjectPayment);
const updatePayment = vi.mocked(finance.updateProjectPayment);
const createCharge = vi.mocked(finance.createProjectCharge);
const registerOutside = vi.mocked(finance.registerProjectPaymentOutside);

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
  setDefaultPayment.mockResolvedValue({ payment: payment({ virtual: false, status: 'paid' }) });
  updatePayment.mockResolvedValue({ payment: payment({ status: 'paid' }) });
  createCharge.mockResolvedValue({ queued: true });
  registerOutside.mockResolvedValue({ submitted: true, awaitingWebhook: true });
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
    await waitFor(() => expect(setDefaultPayment).toHaveBeenCalledWith('project-1', true));
  });

  it('recolhe as etapas, não permite pagar o total e reabre cada etapa individualmente', async () => {
    fetchOverview.mockResolvedValue(overview([
      payment({ id: 'stage-1', name: 'Entrada', amount_cents: 100000, status: 'paid' }),
      payment({ id: 'stage-2', name: 'Entrega', amount_cents: 150000, position: 1 }),
    ]));
    render(<ProjectPaymentsList isAdmin />);

    const expand = await screen.findByRole('button', { name: 'Ver etapas — Site Braslar' });
    expect(screen.queryByText('Entrada')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como pago — Site Braslar' })).not.toBeInTheDocument();
    fireEvent.click(expand);
    expect(await screen.findByText('Entrada')).toBeInTheDocument();
    expect(screen.getByText('Entrega')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {
      name: 'Reabrir pagamento — Site Braslar — Etapa 1 de 2 · Entrada',
    }));
    await waitFor(() => expect(updatePayment).toHaveBeenCalledWith('stage-1', { status: 'pending' }));
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
    expect(screen.queryByRole('button', { name: 'Marcar como pago — Site Braslar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento por fora — Site Braslar' }));

    await waitFor(() => expect(registerOutside).toHaveBeenCalledWith(
      'payment-1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ));
    expect(updatePayment).not.toHaveBeenCalled();
  });
});
