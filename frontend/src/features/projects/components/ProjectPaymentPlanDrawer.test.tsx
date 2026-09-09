import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as finance from '../../finance/financeService';
import { ProjectPaymentPlanDrawer } from './ProjectPaymentPlanDrawer';

vi.mock('../../finance/financeService', () => ({
  fetchProjectFinance: vi.fn(),
  savePaymentPlan: vi.fn(),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(finance.savePaymentPlan).mockResolvedValue(undefined);
  vi.mocked(finance.fetchProjectFinance).mockResolvedValue({
    configured: true,
    environment: 'sandbox',
    project: { id: 'project-1', name: 'Site Braslar', value_cents: 250000 } as finance.ProjectFinance['project'],
    subscription: null,
    projectPayments: [],
    subscriptionPayments: [],
  });
});

describe('ProjectPaymentPlanDrawer', () => {
  it('cria uma divisão rápida que fecha o total e aceita etapas sem data', async () => {
    render(
      <ProjectPaymentPlanDrawer
        project={{ id: 'project-1', name: 'Site Braslar', value_cents: 250000 }}
        appendStage
        onBack={vi.fn()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(await screen.findByDisplayValue('Entrada')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Etapa 2')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('1250,00')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ativar plano' })).toBeEnabled();
    expect(screen.getByLabelText('Vencimento da etapa 1')).toHaveValue('');
    expect(screen.getByLabelText('Vencimento da etapa 2')).toHaveValue('');
  });

  it('permite acrescentar etapa, mas bloqueia uma soma acima do valor do projeto', async () => {
    render(
      <ProjectPaymentPlanDrawer
        project={{ id: 'project-1', name: 'Site Braslar', value_cents: 250000 }}
        appendStage
        onBack={vi.fn()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar etapa' }));
    fireEvent.change(screen.getByLabelText('Valor da etapa 3'), { target: { value: '1,00' } });

    expect(screen.getByText('Valor excedido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ativar plano' })).toBeDisabled();
  });

  it('previsualiza e adiciona somente o saldo restante sem gravar antes do salvamento', async () => {
    render(
      <ProjectPaymentPlanDrawer
        project={{ id: 'project-1', name: 'Site Braslar', value_cents: 250000 }}
        onBack={vi.fn()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Parcelar restante/ }));
    fireEvent.change(screen.getByLabelText('Quantidade de parcelas'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Primeiro vencimento'), { target: { value: '2026-10-20' } });

    expect(screen.getAllByText('R$ 833,33')).toHaveLength(2);
    expect(screen.getByText('R$ 833,34')).toBeInTheDocument();
    expect(screen.getByText('20/12/2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar parcelas' }));
    expect(finance.savePaymentPlan).not.toHaveBeenCalled();
    expect(screen.getAllByDisplayValue('833,33')).toHaveLength(2);
    expect(screen.getByDisplayValue('833,34')).toBeInTheDocument();
    expect(screen.getByText('Não distribuído').parentElement).toHaveTextContent('R$ 0,00');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(finance.savePaymentPlan).toHaveBeenCalledWith('project-1', expect.objectContaining({
      status: 'draft',
      payments: expect.arrayContaining([
        expect.objectContaining({
          kind: 'installment', installmentNumber: 1, installmentCount: 3,
          amountCents: 83333, dueDate: '2026-10-20', groupLabel: 'Restante',
        }),
      ]),
    }));
  });

  it('desconta uma entrada existente e parcela somente o restante', async () => {
    vi.mocked(finance.fetchProjectFinance).mockResolvedValue({
      configured: true,
      environment: 'sandbox',
      project: { id: 'project-1', name: 'Coliseu CRM', value_cents: 1_000_000 } as finance.ProjectFinance['project'],
      subscription: null,
      projectPayments: [{
        id: '11111111-1111-4111-8111-111111111111', project_id: 'project-1', name: 'Entrada',
        description: '', amount_cents: 200_000, due_date: null, paid_at: null, status: 'draft',
        position: 0, notes: '', receipt_url: '', kind: 'stage', installment_group_id: null,
        installment_number: null, installment_count: null, group_label: '', asaas_payment_id: null,
        external_reference: null, payment_url: '', bank_slip_url: '', pix_payload: '',
        billing_type: 'UNDEFINED', provider_status: null, sync_status: 'local', sync_error: null,
        payment_date: null, provider_event_at: null,
      }],
      subscriptionPayments: [],
    });

    render(
      <ProjectPaymentPlanDrawer
        project={{ id: 'project-1', name: 'Coliseu CRM', value_cents: 1_000_000 }}
        onBack={vi.fn()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /Parcelar restante/ }))
      .toHaveTextContent('R$ 8.000,00');
    fireEvent.click(screen.getByRole('button', { name: /Parcelar restante/ }));
    fireEvent.change(screen.getByLabelText('Quantidade de parcelas'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Primeiro vencimento'), { target: { value: '2026-10-20' } });

    expect(within(screen.getByRole('list')).getAllByText('R$ 2.000,00')).toHaveLength(4);
    expect(screen.getByText('20/01/2027')).toBeInTheDocument();
  });
});
