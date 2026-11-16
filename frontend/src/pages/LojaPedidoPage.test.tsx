import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LojaPedidoPage from './LojaPedidoPage';
import { fetchOrder, type OrderCharge, type OrderView } from '../store/api';

vi.mock('../hooks/useGoogleFonts', () => ({ useGoogleFonts: () => {} }));
vi.mock('../seo/useSeo', () => ({ useNoindex: () => {} }));
vi.mock('../store/api', () => ({ fetchOrder: vi.fn() }));

const charge = (over: Partial<OrderCharge>): OrderCharge => ({
  kind: 'payment',
  status: 'pending',
  amountCents: 21000,
  intervalMonths: null,
  description: 'Desenvolvimento do Site',
  subscriptionStatus: null,
  checkoutUrl: 'https://mp.test/go',
  ...over,
});

function order(charges: OrderCharge[]): OrderView {
  const status = charges.every((c) => c.status === 'paid') ? 'paid' : 'pending';
  return {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    status,
    totalCents: 0,
    recurringCents: 0,
    items: [],
    customerName: 'Maria Silva',
    createdAt: '2026-11-16',
    paidAt: null,
    charges,
  };
}

async function renderOrder(charges: OrderCharge[]) {
  vi.mocked(fetchOrder).mockResolvedValue(order(charges));
  render(
    <MemoryRouter initialEntries={['/loja/pedido/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee?t=secret']}>
      <Routes>
        <Route path="/loja/pedido/:id" element={<LojaPedidoPage />} />
      </Routes>
    </MemoryRouter>,
  );
  // A lista das etapas tem aria-label próprio: não confunde com a nav do cabeçalho.
  const list = await screen.findByRole('list', { name: 'Etapas do pagamento' });
  return within(list).getAllByRole('listitem');
}

const mensal = (status: OrderCharge['status']): OrderCharge =>
  charge({ kind: 'subscription', intervalMonths: 1, description: 'Google Meu Negócio', amountCents: 9990, status });
const anual = (status: OrderCharge['status']): OrderCharge =>
  charge({ kind: 'subscription', intervalMonths: 12, description: 'Domínio', amountCents: 8000, status });

describe('página do pedido — passos claros com 1, 2 ou 3 cobranças', () => {
  afterEach(() => vi.clearAllMocks());

  it('1 cobrança: sem contador, um passo a pagar', async () => {
    const items = await renderOrder([charge({ status: 'pending' })]);
    expect(items).toHaveLength(1);
    expect(within(items[0]!).getByText('Pague agora')).toBeTruthy();
    expect(screen.queryByText(/concluíd/)).toBeNull(); // contador só aparece com mais de um passo
  });

  it('2 cobranças (avulso pago + mensalidade pendente): contador e passo atual', async () => {
    const items = await renderOrder([charge({ status: 'paid' }), mensal('pending')]);
    expect(items).toHaveLength(2);
    expect(screen.getByText('1 de 2 concluído')).toBeTruthy();
    expect(within(items[0]!).getByText('Pago')).toBeTruthy();
    expect(within(items[1]!).getByText('Pague agora')).toBeTruthy();
    expect(screen.getByText('Autorizar a mensalidade no Mercado Pago')).toBeTruthy();
  });

  it('3 cobranças (avulso + mensal pagos, anual pendente): 2 de 3 e botão anual', async () => {
    const items = await renderOrder([charge({ status: 'paid' }), mensal('paid'), anual('pending')]);
    expect(items).toHaveLength(3);
    expect(screen.getByText('2 de 3 concluídos')).toBeTruthy();
    expect(within(items[2]!).getByText('Pague agora')).toBeTruthy();
    expect(screen.getByText('Autorizar a assinatura anual no Mercado Pago')).toBeTruthy();
  });

  it('tudo pago: mensagem final, sem passo a pagar', async () => {
    await renderOrder([charge({ status: 'paid' }), mensal('paid'), anual('paid')]);
    expect(screen.getByText(/Está tudo pago/)).toBeTruthy();
    expect(screen.queryByText('Pague agora')).toBeNull();
  });
});
