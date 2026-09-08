import { fireEvent, render, screen } from '@testing-library/react';
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
});
