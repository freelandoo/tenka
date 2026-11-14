/**
 * Catálogo único de TRABALHOS REAIS da TENKA (frente H). Alimenta a vitrine
 * dos heros e os portfólios das divisões. Nada de mockup aqui: todo item é um
 * projeto que existe, com mídia capturada do projeto de verdade.
 *
 * Vídeos: gravados do site no ar (Playwright + GPU), 10 s, 960 px, H.264 —
 * no lugar de iframe, porque iframe contaria visita no Analytics do cliente e
 * a Freelandoo recusa ser embutida (X-Frame-Options: DENY).
 */
export type WorkDivision = 'tech' | 'studios' | 'games';

export interface Work {
  id: string;
  name: string;
  /** O que é, numa linha. */
  kind: string;
  division: WorkDivision;
  poster: string;
  video?: string;
  /** Para onde o "VISITAR" leva. */
  href: string;
  /** Rótulo do botão (padrão: VISITAR). */
  visit?: string;
  /** Página de bastidores, quando existe. */
  making?: string;
}

const W = '/portfolio/works';

export const WORKS: Work[] = [
  // ── TENKA Tech ──────────────────────────────────────────────────────────
  { id: 'gs', name: 'GS Refrigeração', kind: 'Site com ar-condicionado 3D que se monta na rolagem', division: 'tech', poster: `${W}/gs.webp`, video: `${W}/gs.mp4`, href: 'https://gsrefrigeracao.tec.br', making: '/projetos/gs-refrigeracao' },
  { id: 'freelandoo', name: 'Freelandoo', kind: 'Plataforma: marketplace, comunidades, atendimento com IA', division: 'tech', poster: `${W}/freelandoo.webp`, video: `${W}/freelandoo.mp4`, href: 'https://www.freelandoo.com.br', making: '/projetos/freelandoo' },
  { id: 'coliseu', name: 'Sistema Coliseu', kind: 'CRM de academia com reconhecimento facial', division: 'tech', poster: `${W}/coliseu.webp`, video: `${W}/coliseu.mp4`, href: 'https://www.academiacoliseu.com.br', making: '/projetos/sistema-coliseu' },
  { id: 'hidrovap', name: 'Hidrovap', kind: 'Site com a câmera viajando dentro do cano', division: 'tech', poster: `${W}/hidrovap.webp`, video: `${W}/hidrovap.mp4`, href: 'https://hidrovap.com.br', making: '/projetos/hidrovap' },
  { id: 'excelencia', name: 'Excelência Refrigeração', kind: 'Freezer 3D que se desmonta em Babylon.js', division: 'tech', poster: `${W}/excelencia.webp`, video: `${W}/excelencia.mp4`, href: 'https://excelencia.tec.br', making: '/projetos/excelencia-refrigeracao' },
  { id: 'rh', name: 'RH Climatização', kind: 'Site 3D com a marca em relevo', division: 'tech', poster: `${W}/rh.webp`, video: `${W}/rh.mp4`, href: 'https://xn--rhclimatizao-dcb9c.com.br', making: '/projetos/rh-climatizacao' },
  { id: 'vivaar', name: 'VivaAr Climatização', kind: 'Site 3D: da poeira ao ar limpo', division: 'tech', poster: `${W}/vivaar.webp`, video: `${W}/vivaar.mp4`, href: 'https://xn--vivaarclimatizao-snb5e.com.br', making: '/projetos/vivaar-climatizacao' },

  // ── TENKA Studios ───────────────────────────────────────────────────────
  { id: 'innovation', name: 'Innovation Week', kind: 'Embalagem com identidade digital, rótulo 3D e RA', division: 'studios', poster: `${W}/studios/innovation.webp`, video: `${W}/studios/innovation.mp4`, href: '/innovation-week' },
  { id: 'casaviews', name: 'Casa Views × Indemetal', kind: 'Apresentação e coleção ao vivo', division: 'studios', poster: `${W}/studios/casaviews.webp`, video: `${W}/studios/casaviews.mp4`, href: '/innovation-week/casa-views' },
  { id: 'rotulo', name: 'Rótulo em camadas', kind: 'Superfície, luz rasante e QR do rótulo em 3D', division: 'studios', poster: '/portfolio/studios/rotulo-poster.webp', video: '/portfolio/studios/rotulo-scrub.mp4', href: '/innovation-week' },
  { id: 'personagens-catdemon', name: 'Criação de personagens', kind: 'Cat demon: do retrato à folha de modelo', division: 'studios', poster: '/portfolio/games/lab/sheet-full.webp', href: '/projetos/evo-brazil', visit: 'VER' },
  { id: 'personagens-mm', name: 'Personagens do Meu Mundo', kind: 'Cartão, ficha e equipamentos de cada personagem', division: 'studios', poster: `${W}/games/mm-cartao-personagem.webp`, href: '/projetos/meu-mundo', visit: 'VER' },

  // ── TENKA Games ─────────────────────────────────────────────────────────
  { id: 'mm-dominios', name: 'Meu Mundo — os Domínios', kind: 'Mundo aberto 3D no navegador, com chefões e bandos', division: 'games', poster: `${W}/games/mm-golem-vulcao.webp`, href: 'https://www.freelandoo.com.br', visit: 'VISITAR', making: '/projetos/meu-mundo' },
  { id: 'mm-jetpack', name: 'Meu Mundo — Jetpack', kind: 'Minijogo de corrida com seis fases', division: 'games', poster: `${W}/games/mm-jetpack-floresta.webp`, href: 'https://www.freelandoo.com.br', making: '/projetos/meu-mundo' },
  { id: 'evo', name: 'EVO Brazil', kind: 'Jogo de luta: lutadores 3D e arena multiplayer', division: 'games', poster: '/portfolio/games/evo/selecao.webp', video: '/portfolio/games/evo/selecao.mp4', href: '/projetos/evo-brazil', visit: 'VER', making: '/projetos/evo-brazil' },
  { id: 'astronaut', name: 'Astronaut Jetpack', kind: 'Advergame da Innovation Week — jogue agora', division: 'games', poster: '/portfolio/games/jetpack.webp', href: '/innovation-week/jogo', visit: 'JOGAR', making: '/projetos/astronaut-jetpack' },
  { id: 'mm-minijogos', name: 'Meu Mundo — minijogos', kind: 'Rolê Noturno, Gincana e Jetpack', division: 'games', poster: `${W}/games/mm-menu-role.webp`, href: 'https://www.freelandoo.com.br', making: '/projetos/meu-mundo' },
  { id: 'mm-personagem', name: 'Meu Mundo — criação de personagem', kind: 'Ficha, equipamentos e evolução', division: 'games', poster: `${W}/games/mm-ficha.webp`, href: 'https://www.freelandoo.com.br', making: '/projetos/meu-mundo' },
  { id: 'comunidade-games', name: 'Comunidade Games', kind: 'A comunidade da Freelandoo onde o Meu Mundo vive', division: 'games', poster: `${W}/games/mm-cidade.webp`, href: 'https://www.freelandoo.com.br' },
];

export const worksOf = (division: WorkDivision) => WORKS.filter((w) => w.division === division);

/** Fundo do hero: o trabalho mais relevante de cada divisão. */
export const HERO_BACKDROP: Record<WorkDivision, { poster: string; video?: string }> = {
  tech: { poster: `${W}/gs.webp`, video: `${W}/gs.mp4` },
  studios: { poster: `${W}/studios/innovation.webp`, video: `${W}/studios/innovation.mp4` },
  games: { poster: `${W}/games/mm-jetpack-floresta.webp` },
};

export const isExternal = (href: string) => /^https?:\/\//.test(href);

/**
 * Vitrine de cada página de serviço (H4): os trabalhos reais que mais se
 * aproximam do tópico, o primeiro é o fundo. Onde a TENKA ainda não tem
 * projeto daquele tipo (treinamento em VR, maquete arquitetônica), a vitrine
 * mostra o trabalho 3D/games mais próximo — a página nunca diz que é do tópico.
 * Subpáginas (normas, "quanto custa") herdam a do pai pelo prefixo.
 */
const SERVICE_WORKS: Record<string, string[]> = {
  '/tech/sites': ['gs', 'hidrovap', 'excelencia', 'rh', 'vivaar'],
  '/tech/sistemas-sob-medida': ['coliseu', 'freelandoo', 'mm-dominios'],
  '/tech/automacoes-e-agentes-de-ia': ['freelandoo', 'coliseu'],
  '/tech/aplicativos': ['coliseu', 'freelandoo', 'mm-jetpack'],
  '/studios/animacao-3d': ['rotulo', 'innovation', 'casaviews', 'personagens-catdemon'],
  '/studios/maquete-eletronica-3d': ['mm-dominios', 'gs', 'excelencia', 'innovation'],
  '/studios/mockup-3d-de-produto': ['gs', 'excelencia', 'rotulo', 'innovation'],
  '/studios/identidade-visual-e-branding': ['rh', 'vivaar', 'innovation', 'casaviews'],
  '/games/treinamento-em-realidade-virtual': ['mm-dominios', 'evo', 'astronaut', 'mm-personagem'],
  '/games/ativacao-de-marca-em-realidade-virtual': ['innovation', 'astronaut', 'casaviews', 'evo'],
  '/games/advergame-e-gamificacao': ['astronaut', 'mm-jetpack', 'mm-minijogos', 'innovation'],
  '/games/jogos-mobile': ['mm-jetpack', 'mm-minijogos', 'evo', 'astronaut'],
};

export function worksForService(path: string): Work[] {
  const key = Object.keys(SERVICE_WORKS)
    .filter((k) => path === k || path.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (!key) return [];
  return SERVICE_WORKS[key].map((id) => WORKS.find((w) => w.id === id)).filter((w): w is Work => Boolean(w));
}
