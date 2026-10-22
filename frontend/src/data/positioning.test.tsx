import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  AUDIENCE_PATHS,
  DIVISION_CARDS,
  HEADLINE,
  LEAD,
  SLOGAN,
} from './positioning';
import { REDIRECTS, routeFor } from '../seo/routes';
import { organizationSchema, schemasFor } from '../seo/schema';
import { CONTACT_EMAIL } from '../config/contact';
import SiteFooter from '../components/site/SiteFooter';
import DivisionFooterLinks from '../components/site/DivisionFooterLinks';

/**
 * O reposicionamento só existe se a mesma mensagem aparecer em todo lugar.
 *
 * As regressões que esta suíte impede são as que o site já teve: rodapé de
 * divisão publicando um e-mail que não existe e linkando rota aposentada,
 * mensagem da home divergindo do HTML estático servido ao crawler, e link da
 * home caindo num 301 em vez de na página canônica.
 */

/**
 * `DivisionFooterLinks` é o bloco que as três experiências de divisão montam no
 * rodapé; `SiteFooter`, o das páginas institucionais e da home. Juntos cobrem
 * todo rodapé público do site.
 */
const FOOTERS: [string, () => React.ReactElement][] = [
  ['TENKA Games', () => <DivisionFooterLinks current="/games" />],
  ['TENKA Studios', () => <DivisionFooterLinks current="/studios" />],
  ['TENKA Tech', () => <DivisionFooterLinks current="/tech" />],
  ['institucional', () => <SiteFooter path="/" />],
];

function hrefs(): string[] {
  return screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '');
}

describe('assinatura da marca', () => {
  it('preserva o slogan como assinatura', () => {
    expect(SLOGAN).toBe('Realize seu desejo!');
  });

  it('declara o slogan no Organization, onde buscador e motor de IA leem', () => {
    expect(organizationSchema().slogan).toBe(SLOGAN);
  });

  it.each(FOOTERS)('assina o rodapé da %s', (_name, renderFooter) => {
    render(<MemoryRouter>{renderFooter()}</MemoryRouter>);
    expect(screen.getByText(new RegExp(`Tenka Group — ${SLOGAN}`))).toBeInTheDocument();
  });
});

describe('home: tela e HTML estático contam a mesma história', () => {
  const home = routeFor('/')!;

  it('serve ao crawler o mesmo H1 e a mesma abertura que a página mostra', () => {
    expect(home.h1).toBe(HEADLINE);
    expect(home.intro).toBe(LEAD);
  });

  it('mantém os termos comerciais no texto rastreável, não só a frase de marca', () => {
    const crawlable = [home.intro, ...(home.highlights ?? [])].join(' ').toLowerCase();
    for (const term of ['realidade virtual', '3d', 'identidade visual', 'sites', 'sistemas']) {
      expect(crawlable, term).toContain(term);
    }
  });

  it('publica FAQPage na home', () => {
    expect(home.faq?.length).toBeGreaterThan(0);
    const types = schemasFor(home).map((block) => block['@type']);
    expect(types).toContain('FAQPage');
  });
});

describe('caminhos de conversão da home', () => {
  const targets = [
    ...DIVISION_CARDS.flatMap((card) => [card.to, ...card.entries.map((entry) => entry.to)]),
    ...AUDIENCE_PATHS.flatMap((path) => path.links.map((link) => link.to)),
  ];

  it('aponta toda entrada para uma rota que existe', () => {
    for (const to of targets) {
      expect(routeFor(to), to).toBeDefined();
    }
  });

  it('não manda a home para um 301 em vez da página canônica', () => {
    for (const to of targets) {
      expect(Object.keys(REDIRECTS), to).not.toContain(to);
    }
  });
});

describe('rodapés das divisões', () => {
  const divisionFooters = FOOTERS.slice(0, 3);

  it.each(divisionFooters)('%s linka as outras duas divisões, não a si mesma', (name, renderFooter) => {
    render(<MemoryRouter>{renderFooter()}</MemoryRouter>);
    const divisions = ['/games', '/studios', '/tech'];
    const own = divisions.find((path) => name.toLowerCase().includes(path.slice(1)))!;
    for (const other of divisions.filter((path) => path !== own)) {
      expect(hrefs(), other).toContain(other);
    }
    expect(hrefs(), own).not.toContain(own);
  });

  it.each(divisionFooters)('%s publica o e-mail real', (_name, renderFooter) => {
    render(<MemoryRouter>{renderFooter()}</MemoryRouter>);
    expect(hrefs()).toContain(`mailto:${CONTACT_EMAIL}`);
    expect(hrefs().join(' ')).not.toContain('contato@tenka.com.br');
    expect(CONTACT_EMAIL).not.toContain('tenka.com.br');
  });

  it.each(divisionFooters)('%s não linka rota aposentada', (_name, renderFooter) => {
    render(<MemoryRouter>{renderFooter()}</MemoryRouter>);
    for (const retired of Object.keys(REDIRECTS)) {
      expect(hrefs(), retired).not.toContain(retired);
    }
  });

  it.each(divisionFooters)('%s tem saída para contato, projetos e sobre', (_name, renderFooter) => {
    render(<MemoryRouter>{renderFooter()}</MemoryRouter>);
    const links = hrefs();
    for (const exit of ['/contato', '/projetos', '/sobre']) {
      expect(links, exit).toContain(exit);
    }
  });
});
