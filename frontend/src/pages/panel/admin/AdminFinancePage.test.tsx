import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminFinancePage from './AdminFinancePage';
import * as finance from '../../../features/finance/financeService';

vi.mock('../../../features/admin/useAdminBoardData', () => ({
  useAdminBoardData: () => ({ status: 'ready', projects: [], profiles: [], refresh: vi.fn() }),
}));
vi.mock('../../../features/projects/components/CarteiraView', () => ({
  CarteiraView: () => <div data-testid="carteira">Carteira e extrato</div>,
}));
vi.mock('../../../features/finance/AdminBillingView', () => ({
  AdminBillingView: () => <div data-testid="integracao">Configurações da integração</div>,
}));
vi.mock('../../../features/finance/financeService', () => ({ fetchFinanceQueue: vi.fn() }));
vi.mock('../../../lib/api/events', () => ({ subscribeRealtime: () => () => {} }));

const fetchQueue = vi.mocked(finance.fetchFinanceQueue);

const queue = (over: Partial<finance.FinanceQueueHealth> = {}): finance.FinanceQueueHealth => ({
  level: 'ok', reasons: [], stalledOperations: 0, exhaustedOperations: 0,
  uncertainOperations: 0, needsReviewEvents: 0, stalledEvents: 0,
  oldestPendingAt: null, lastWebhookAt: null, ...over,
});

beforeEach(() => {
  fetchQueue.mockReset();
  fetchQueue.mockResolvedValue(queue());
});

describe('AdminFinancePage', () => {
  it('mantém carteira e extrato no topo e deixa a integração recolhida abaixo', () => {
    render(<AdminFinancePage />);

    const carteira = screen.getByTestId('carteira');
    const details = screen.getByText('Integração, assinaturas e últimas mensalidades').closest('details');
    expect(details).not.toHaveAttribute('open');
    expect(carteira.compareDocumentPosition(details as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('integracao')).toBeInTheDocument();
  });

  it('não mostra alerta quando a fila está saudável', async () => {
    render(<AdminFinancePage />);
    await waitFor(() => expect(fetchQueue).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra a fila parada fora do acordeão, onde o alerta é visto', async () => {
    fetchQueue.mockResolvedValue(queue({
      level: 'critical', exhaustedOperations: 2,
      reasons: ['2 operação(ões) desistiram após todas as tentativas.'],
    }));
    render(<AdminFinancePage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('2 operação(ões) desistiram após todas as tentativas.');
    // Fora do <details>: um aviso crítico dentro de um acordeão fechado não avisa.
    expect(alert.closest('details')).toBeNull();
  });

  it('abre o painel técnico a partir do alerta, que é onde estão os botões', async () => {
    fetchQueue.mockResolvedValue(queue({
      level: 'critical', needsReviewEvents: 1,
      reasons: ['1 webhook(s) sem alvo reconhecido aguardando revisão.'],
    }));
    render(<AdminFinancePage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir a fila de atenção' }));
    const details = screen.getByText('Integração, assinaturas e últimas mensalidades').closest('details');
    expect(details).toHaveAttribute('open');
  });
});
