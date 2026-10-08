import { describe, expect, it } from 'vitest';
import {
  LEGAL_ROUTES,
  POLICY_REVIEWED_AT,
  POLICY_REVIEW_MONTHS,
  POLICY_SECTIONS,
} from './legal';
import { CONSENT_STORAGE_KEY } from '../lib/consent';
import { routeFor } from './routes';
import indexHtml from '../../index.html?raw';

/**
 * Política de privacidade desatualizada não quebra build, não dá erro em tela e
 * não aparece em nenhum relatório. Ela só envelhece até alguém precisar dela.
 * Estes testes são o que faz o repositório cobrar a revisão.
 */
describe('política de privacidade', () => {
  it('está na lista de rotas e entra no sitemap', () => {
    expect(routeFor('/politica-de-privacidade')).toBeDefined();
    expect(LEGAL_ROUTES[0].noindex).toBeUndefined();
  });

  it('cobre o que a LGPD exige que o titular possa saber', () => {
    const texto = JSON.stringify(POLICY_SECTIONS).toLowerCase();
    // Art. 9: finalidade, duração, controlador, compartilhamento, direitos.
    for (const termo of [
      'controlador',
      'base legal',
      'legítimo interesse',
      'compartilha',
      'transferência internacional',
      'encarregado',
      'portabilidade',
      'revogação',
    ]) {
      expect(texto, `a política precisa tratar de "${termo}"`).toContain(termo);
    }
  });

  it('declara a base legal de cada categoria de cookie', () => {
    const cookies = POLICY_SECTIONS.find((s) => s.title.includes('Cookies'));
    expect(cookies?.items?.length).toBeGreaterThanOrEqual(3);
    for (const item of cookies!.items!) {
      // A ANPD pede que o banner de segundo nível identifique a base legal por
      // categoria. Categoria sem base declarada é a falha mais comum.
      const temBase =
        /base legal/i.test(item.detail) || /não utilizamos/i.test(item.detail);
      expect(temBase, `categoria "${item.term}" sem base legal declarada`).toBe(true);
    }
  });

  it('não promete o que o site não faz', () => {
    const texto = JSON.stringify(POLICY_SECTIONS).toLowerCase();
    // O site não tem backend de leads: dizer que armazenamos em banco próprio
    // seria falso, e é o erro clássico de politica copiada de modelo.
    expect(texto).toContain('não têm servidor próprio');
    expect(texto).toContain('não vendemos');
  });

  it('avisa quando a revisão passou do prazo', () => {
    const revisao = new Date(`${POLICY_REVIEWED_AT}T00:00:00Z`);
    expect(Number.isNaN(revisao.getTime()), 'data de revisão inválida').toBe(false);

    const limite = new Date(revisao);
    limite.setMonth(limite.getMonth() + POLICY_REVIEW_MONTHS);

    expect(
      Date.now() < limite.getTime(),
      `A política foi revisada em ${POLICY_REVIEWED_AT} e passou de ${POLICY_REVIEW_MONTHS} meses. ` +
        'Confira se a LGPD, as resoluções da ANPD e os fornecedores citados continuam os mesmos, ' +
        'atualize o texto e mova POLICY_REVIEWED_AT em src/seo/legal.ts.',
    ).toBe(true);
  });
});

describe('consentimento de cookies', () => {
  it('define os padrões do Consent Mode antes do config do gtag', () => {
    const posConsent = indexHtml.indexOf("gtag('consent', 'default'");
    const posConfig = indexHtml.indexOf("gtag('config'");
    expect(posConsent).toBeGreaterThan(-1);
    // Se o config vier antes, a primeira medição acontece sem saber a escolha
    // de quem já tinha recusado — a recusa só valeria no carregamento seguinte.
    expect(posConsent).toBeLessThan(posConfig);
  });

  it('nega os sinais de publicidade por padrão', () => {
    for (const sinal of ['ad_storage', 'ad_user_data', 'ad_personalization']) {
      const re = new RegExp(`${sinal}:\\s*'denied'`);
      expect(re.test(indexHtml), `${sinal} deveria nascer negado`).toBe(true);
    }
  });

  it('lê a recusa salva antes de aplicar o padrão', () => {
    expect(indexHtml).toContain(CONSENT_STORAGE_KEY);
    expect(indexHtml).toContain("= 'denied'");
  });
});

/**
 * O art. 41 exige divulgar a IDENTIDADE do encarregado, não só um e-mail.
 * Política com "entre em contato pelo nosso e-mail" e nenhum nome é a forma
 * mais comum de descumprir esse artigo achando que cumpriu.
 */
describe('encarregado (art. 41)', () => {
  it('nomeia uma pessoa, não só um canal', () => {
    const enc = POLICY_SECTIONS.find((s) => s.title.includes('Encarregado'));
    expect(enc).toBeDefined();
    const texto = (enc!.body ?? []).join(' ');
    expect(texto).toContain('João Victor Bispo de Oliveira');
    expect(texto).toMatch(/@/); // e o canal de contato
  });
});

/**
 * A seção de transferência internacional não pode afirmar instrumento que não
 * foi verificado. Para o Google Analytics o Google usa termos entre
 * controladores, e não ficou confirmado que as cláusulas-padrão do Anexo II da
 * Resolução ANPD 19/2024 se aplicam a esse produto — então a política descreve
 * o fato da transferência sem alegar o instrumento específico.
 */
describe('transferência internacional', () => {
  it('não alega cláusulas-padrão sem verificação', () => {
    const ti = POLICY_SECTIONS.find((s) => s.title.includes('Transferência'));
    const texto = (ti!.body ?? []).join(' ');
    expect(texto).toContain('Resolução CD/ANPD nº 19/2024');
    expect(texto.toLowerCase()).not.toContain('incluindo cláusulas-padrão');
    // Precisa oferecer a saída prática: recusar a medição evita a transferência.
    expect(texto.toLowerCase()).toContain('recusar a medição');
  });
});
