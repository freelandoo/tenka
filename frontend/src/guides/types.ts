/**
 * Guias de SEO (frente S): uma página principal por tema e uma página por
 * pergunta real que o cliente pesquisa. Resposta direta no primeiro parágrafo,
 * texto próprio em cada página (o teste barra repetição), e todo guia aponta
 * para um produto, para os bastidores de um projeto real e para o tema.
 *
 * Perguntas frequentes entram como conteúdo da página, sem FAQPage em JSON-LD:
 * desde 05/2026 o Google não destaca mais FAQ no resultado.
 */
export interface GuideBlock {
  h2: string;
  p?: string[];
  list?: string[];
}

export interface Guide {
  /** Caminho completo: /guias/<tema> ou /guias/<tema>/<pergunta>. */
  path: string;
  /** Palavra-chave principal (para quem escreve; não vai para a tela). */
  keyword: string;
  title: string;
  description: string;
  h1: string;
  /** A resposta direta, logo no começo. */
  lead: string;
  blocks: GuideBlock[];
  faqs: { q: string; a: string }[];
  /** Links internos obrigatórios. */
  links: { product: { to: string; label: string }; making: { to: string; label: string } };
  /** Trabalhos da vitrine (ids de src/works). */
  works: string[];
  accent: string;
}
