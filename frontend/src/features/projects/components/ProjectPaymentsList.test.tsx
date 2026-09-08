import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectPaymentRow } from '../../../lib/supabase/database.types';
import * as finance from '../../finance/financeService';
import { ProjectPaymentsList } from './ProjectPaymentsList';

vi.mock('../../finance/financeService', () => ({
  fetchFinanceOverview: vi.fn(),
  setDefaultProjectPayment: vi.fn(),
  updateProjectPayment: vi.fn(),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const fetchOverview = vi.mocked(finance.fetchFinanceOverview);
const setDefaultPayment = vi.mocked(finance.setDefaultProjectPayment);
const updatePayment = vi.mocked(finance.updateProjectPayment);

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
  project_name: 'Site Braslar',
  client_name: 'Braslar',
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
});

describe('ProjectPaymentsList', () => {
  it('exibe projeto sem plano como pendente e materializa o pagamento ao confirmar', async () => {
    fetchOverview.mockResolvedValue(overview([payment({ id: 'virtual:project-1', virtual: true })]));
    render(<ProjectPaymentsList isAdmin />);

    const button = await screen.findByRole('button', {
      name: 'Marcar como pago — Site Braslar',
    });
    const row = screen.getByText('Site Braslar').closest('li') as HTMLElement;
    expect(within(row).getByText('Pendente')).toBeInTheDocument();
    expect(within(row).getByText('R$ 2.500,00')).toBeInTheDocument();

    fireEvent.click(button);
    await waitFor(() => expect(setDefaultPayment).toHaveBeenCalledWith('project-1', true));
  });

  it('mostra etapas separadas e permite reabrir uma etapa paga', async () => {
    fetchOverview.mockResolvedValue(overview([
      payment({ id: 'stage-1', name: 'Entrada', amount_cents: 100000, status: 'paid' }),
      payment({ id: 'stage-2', name: 'Entrega', amount_cents: 150000, position: 1 }),
    ]));
    render(<ProjectPaymentsList isAdmin />);

    expect(await screen.findByText('Etapa 1 de 2 · Entrada · Braslar')).toBeInTheDocument();
    expect(screen.getByText('Etapa 2 de 2 · Entrega · Braslar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {
      name: 'Reabrir pagamento — Site Braslar — Etapa 1 de 2 · Entrada',
    }));
    await waitFor(() => expect(updatePayment).toHaveBeenCalledWith('stage-1', { status: 'pending' }));
  });
});
