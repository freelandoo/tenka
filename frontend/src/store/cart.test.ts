import { beforeEach, describe, expect, it } from 'vitest';
import { cart, cartProducts, cartTotals, normalize } from './cart';

describe('regras do carrinho', () => {
  beforeEach(() => cart.clear());

  it('site entra com hospedagem por padrão', () => {
    expect(normalize(['site-premium'])).toEqual(['site-premium', 'hospedagem']);
  });

  it('um site por pedido: o último vence', () => {
    expect(normalize(['site-essencial', 'hospedagem', 'site-experiencia'])).toEqual(['site-experiencia', 'hospedagem']);
  });

  it('GMN avulso junto de site vira o combo de 99,90', () => {
    expect(normalize(['site-essencial', 'google-meu-negocio'])).toEqual(['site-essencial', 'hospedagem-gmn']);
  });

  it('mensalidade de site sem site cai fora', () => {
    expect(normalize(['hospedagem'])).toEqual([]);
    expect(normalize(['hospedagem-gmn', 'google-meu-negocio'])).toEqual(['google-meu-negocio']);
  });

  it('tirar o site leva a mensalidade junto', () => {
    cart.add('site-essencial');
    cart.setSiteSubscription('hospedagem-gmn');
    expect(cart.get()).toEqual(['site-essencial', 'hospedagem-gmn']);
    cart.remove('site-essencial');
    expect(cart.get()).toEqual([]);
  });

  it('persiste no localStorage', () => {
    cart.add('site-premium');
    expect(JSON.parse(localStorage.getItem('tenka:loja:carrinho')!)).toEqual(['site-premium', 'hospedagem']);
  });

  it('totais de exibição separam agora e por mês', () => {
    expect(cartTotals(cartProducts(['site-premium', 'hospedagem-gmn']))).toEqual({ oneTimeCents: 65000, monthlyCents: 9990 });
  });
});
