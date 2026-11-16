import { beforeEach, describe, expect, it } from 'vitest';
import { cart, cartProducts, cartTotals, normalize } from './cart';
import { registerCustomProducts, type StoreProduct } from './catalog';

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

describe('produtos cadastrados pelo painel', () => {
  const custom = (slug: string, kind: StoreProduct['kind'], priceCents: number): StoreProduct => ({
    slug, name: slug, kind, category: 'loja', tagline: '', priceCents, features: [], model: 'browser', custom: true,
  });
  beforeEach(() => {
    registerCustomProducts([custom('trafego', 'subscription', 49900), custom('logo', 'fixed', 15000)]);
    cart.clear();
  });

  it('única convive com qualquer coisa', () => {
    expect(normalize(['site-premium', 'logo'])).toEqual(['site-premium', 'hospedagem', 'logo']);
  });

  it('recorrente é uma assinatura: a mais recente vence', () => {
    // site depois da recorrente: o site (com hospedagem) fica
    expect(normalize(['trafego', 'site-premium'])).toEqual(['site-premium', 'hospedagem']);
    // recorrente depois do site: o site sai, porque site exige a hospedagem
    expect(normalize(['site-premium', 'hospedagem', 'trafego'])).toEqual(['trafego']);
    expect(normalize(['google-meu-negocio', 'trafego', 'logo'])).toEqual(['trafego', 'logo']);
  });

  it('totais e lookup enxergam o produto da API', () => {
    expect(cartTotals(cartProducts(['logo', 'trafego']))).toEqual({ oneTimeCents: 15000, monthlyCents: 49900 });
  });

  it('slug que a API ainda não mandou não some do carrinho, mas não é exibido', () => {
    cart.add('ainda-nao-carregado');
    expect(cart.get()).toEqual(['ainda-nao-carregado']);
    expect(cartProducts(cart.get())).toEqual([]);
  });
});
