import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminFinancePage from './AdminFinancePage';

vi.mock('../../../features/admin/useAdminBoardData', () => ({
  useAdminBoardData: () => ({ status: 'ready', projects: [], profiles: [], refresh: vi.fn() }),
}));
vi.mock('../../../features/projects/components/CarteiraView', () => ({
  CarteiraView: () => <div data-testid="carteira">Carteira e extrato</div>,
}));
vi.mock('../../../features/finance/AdminBillingView', () => ({
  AdminBillingView: () => <div data-testid="integracao">Configurações da integração</div>,
}));

describe('AdminFinancePage', () => {
  it('mantém carteira e extrato no topo e deixa a integração recolhida abaixo', () => {
    render(<AdminFinancePage />);

    const carteira = screen.getByTestId('carteira');
    const details = screen.getByText('Integração, assinaturas e últimas mensalidades').closest('details');
    expect(details).not.toHaveAttribute('open');
    expect(carteira.compareDocumentPosition(details as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('integracao')).toBeInTheDocument();
  });
});
