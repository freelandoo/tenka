import type { Glyph } from './technologies';

/** Which Core subsystem a capability lights up when activated. Read by the
 *  scene so hovering a module changes a real part of the Tenka Core. */
export type CoreModule = 'orbit' | 'grid' | 'nodes' | 'material' | 'distortion' | 'overlay';

export interface CapabilityModule {
  id: string;
  name: string;
  code: string;
  description: string;
  labels: string[];
  status: string;
  glyph: Glyph;
  coreModule: CoreModule;
}

export const CAPABILITY_MODULES: CapabilityModule[] = [
  {
    id: 'game-design',
    name: 'GAME DESIGN',
    code: 'MOD-01',
    description: 'Regras, progressão, economia, combate e sistemas que sustentam a experiência.',
    labels: ['SISTEMAS', 'LOOPS', 'BALANCE'],
    status: 'ONLINE',
    glyph: 'hex',
    coreModule: 'orbit',
  },
  {
    id: 'prototipagem',
    name: 'PROTOTIPAGEM',
    code: 'MOD-02',
    description: 'Versões jogáveis para testar ideias antes de ampliar a produção.',
    labels: ['GREYBOX', 'PLAYTEST', 'ITERAÇÃO'],
    status: 'ONLINE',
    glyph: 'triangle',
    coreModule: 'grid',
  },
  {
    id: 'desenvolvimento',
    name: 'DESENVOLVIMENTO',
    code: 'MOD-03',
    description: 'Arquitetura, programação e integração dos sistemas que dão forma ao jogo.',
    labels: ['UNITY', 'UNREAL', 'GODOT'],
    status: 'ONLINE',
    glyph: 'square',
    coreModule: 'grid',
  },
  {
    id: 'direcao-de-arte',
    name: 'DIREÇÃO DE ARTE',
    code: 'MOD-04',
    description: 'Linguagem visual, ambientes, personagens e identidade de cada mundo.',
    labels: ['CONCEPT', 'LOOKDEV', 'LUZ'],
    status: 'ONLINE',
    glyph: 'diamond',
    coreModule: 'material',
  },
  {
    id: 'narrativa',
    name: 'NARRATIVA',
    code: 'MOD-05',
    description: 'Histórias, conflitos e decisões integradas às ações do jogador.',
    labels: ['LORE', 'ROTEIRO', 'DIÁLOGO'],
    status: 'ONLINE',
    glyph: 'circle',
    coreModule: 'nodes',
  },
  {
    id: 'ui-ux',
    name: 'UI E UX PARA GAMES',
    code: 'MOD-06',
    description: 'Interfaces que orientam sem quebrar a imersão.',
    labels: ['HUD', 'MENUS', 'ACESSO'],
    status: 'ONLINE',
    glyph: 'square',
    coreModule: 'overlay',
  },
  {
    id: 'webgl',
    name: 'EXPERIÊNCIAS WEBGL',
    code: 'MOD-07',
    description: 'Mundos interativos executados diretamente no navegador.',
    labels: ['THREE.JS', 'SHADERS', 'WEB'],
    status: 'ONLINE',
    glyph: 'triangle',
    coreModule: 'distortion',
  },
  {
    id: 'trailers',
    name: 'TRAILERS E CONTEÚDO',
    code: 'MOD-08',
    description: 'Apresentações, trailers e peças construídas a partir do próprio universo do jogo.',
    labels: ['CAPTURA', 'EDIÇÃO', 'STEAM'],
    status: 'ONLINE',
    glyph: 'diamond',
    coreModule: 'material',
  },
];
