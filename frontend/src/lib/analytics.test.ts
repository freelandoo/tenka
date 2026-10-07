import { describe, expect, it } from 'vitest';
import { GA_MEASUREMENT_ID, shouldTrack, trackContactClick, trackLead } from './analytics';
import indexHtml from '../../index.html?raw';

/**
 * O GA4 numa SPA erra em silêncio: o relatório enche de dados e parece certo.
 * Estes testes travam as duas formas de errar que já estavam montadas aqui.
 */
describe('Google Analytics', () => {
  it('carrega a tag com o ID da propriedade', () => {
    expect(indexHtml).toContain(`gtag/js?id=${GA_MEASUREMENT_ID}`);
    expect(indexHtml).toContain(`gtag('config', '${GA_MEASUREMENT_ID}'`);
  });

  it('mantém o page_view automático desligado', () => {
    // Ligado, ele contaria só a primeira página de cada visita e registraria
    // o título da rota anterior. Quem dispara é o usePageviews.
    expect(indexHtml).toContain('send_page_view: false');
  });

  it('deixa a área interna fora do relatório', () => {
    expect(shouldTrack('/')).toBe(true);
    expect(shouldTrack('/games/treinamento-em-realidade-virtual')).toBe(true);
    expect(shouldTrack('/painel')).toBe(false);
    expect(shouldTrack('/painel/admin/clientes')).toBe(false);
    expect(shouldTrack('/admin')).toBe(false);
    // Não pode pegar rota que só começa com as mesmas letras.
    expect(shouldTrack('/paineis-solares')).toBe(true);
  });

  it('manda generate_lead e contact_click com os parametros que importam', () => {
    const hits: { name: string; params: Record<string, unknown> }[] = [];
    (window as unknown as { gtag: unknown }).gtag = (
      _cmd: string,
      name: string,
      params: Record<string, unknown>,
    ) => hits.push({ name, params });

    trackLead('whatsapp', 'brief_games');
    trackContactClick('email', 'rodape');

    expect(hits[0].name).toBe('generate_lead');
    expect(hits[0].params.method).toBe('whatsapp');
    expect(hits[0].params.source).toBe('brief_games');
    expect(hits[1].name).toBe('contact_click');
    expect(hits[1].params.method).toBe('email');
    // page_path em todo evento: e o que responde qual pagina originou o lead.
    expect(hits[0].params).toHaveProperty('page_path');
    expect(hits[1].params).toHaveProperty('page_path');
  });
});
