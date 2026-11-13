import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ fetch: vi.fn(), authorize: vi.fn() }));
vi.mock('../features/finance/cardAuthorizationService', () => ({
  fetchPublicCardAuthorization: api.fetch,
  authorizePublicCard: api.authorize,
}));

import CardAuthorizationPage from './CardAuthorizationPage';

const ACTIVE = {
  state: 'active', expiresAt: '2026-11-13T12:00:00Z', termVersion: '2026-11-10.v1',
  tokenizationAvailable: false, environment: 'sandbox',
  terms: {
    merchant: 'TENKA', clientName: 'GS Refrigeracao', dueDay: 10,
    maxCycleAmountCents: 18000,
    variableRule: 'O total corresponde aos serviços que vencerem no mês.',
    priceChangeRule: 'Novos serviços exigem novo aceite.',
    supportEmail: 'contato@tenka.com.br', privacyPath: '/politica-de-privacidade',
    services: [
      { projectName: 'Site', name: 'Hospedagem mensal', amountCents: 10000, frequency: 'monthly', nextDueDate: '2026-12-10' },
      { projectName: 'Site', name: 'Renovacao anual', amountCents: 8000, frequency: 'annual', nextDueDate: '2026-12-10' },
    ],
  },
} as const;

function view() {
  return render(<MemoryRouter initialEntries={['/autorizar-cobrancas/token-de-teste']}>
    <Routes><Route path="/autorizar-cobrancas/:token" element={<CardAuthorizationPage />} /></Routes>
  </MemoryRouter>);
}

describe('portal publico de autorizacao', () => {
  beforeEach(() => { api.fetch.mockReset(); api.authorize.mockReset(); });

  it('explica a variacao, o limite e bloqueia cartao real sem Sandbox configurado', async () => {
    api.fetch.mockResolvedValue(ACTIVE);
    view();
    expect(await screen.findByRole('heading', { name: /autorize suas cobranças/i })).toBeInTheDocument();
    expect(screen.getByText('GS Refrigeracao')).toBeInTheDocument();
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 80,00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /autorizar cobranças/i })).toBeDisabled();
    expect(screen.getByText(/não aceita cartões reais/i)).toBeInTheDocument();
  });

  it('mostra uma resposta segura para link ja utilizado', async () => {
    api.fetch.mockResolvedValue({ ...ACTIVE, state: 'used' });
    view();
    expect(await screen.findByRole('heading', { name: /link já utilizado/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/número do cartão/i)).not.toBeInTheDocument();
  });
});
