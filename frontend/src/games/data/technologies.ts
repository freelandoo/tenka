export type Glyph = 'diamond' | 'square' | 'triangle' | 'circle' | 'hex';

export interface TechnologyItem {
  id: string;
  name: string;
  /** Small geometric glyph drawn with CSS — no brand logos. */
  glyph: Glyph;
  /** One-line summary shown in the inventory grid. */
  description: string;
  /** "Uso:" — what the tool does for us. */
  use: string;
  /** "Aplicação:" — where it shows up in real projects. */
  application: string;
  status: 'ATIVO' | 'EM USO' | 'PESQUISA';
}

export interface TechnologyCategory {
  id: string;
  name: string;
  items: TechnologyItem[];
}

export const TECHNOLOGY_ARSENAL: TechnologyCategory[] = [
  {
    id: 'engines',
    name: 'Engines',
    items: [
      {
        id: 'unity',
        name: 'Unity',
        glyph: 'square',
        description: 'Produção 2D/3D multiplataforma.',
        use: 'produção de jogos 2D e 3D do mobile ao PC.',
        application: 'projetos completos, protótipos rápidos e builds multiplataforma.',
        status: 'ATIVO',
      },
      {
        id: 'unreal',
        name: 'Unreal Engine',
        glyph: 'diamond',
        description: 'Alta fidelidade e cinemática.',
        use: 'experiências de alta fidelidade visual e ferramentas cinematográficas.',
        application: 'ação, terror, mundos densos e sequências in-engine.',
        status: 'ATIVO',
      },
      {
        id: 'godot',
        name: 'Godot',
        glyph: 'triangle',
        description: 'Engine open source e leve.',
        use: 'iteração rápida e jogos 2D com pipeline enxuto.',
        application: 'protótipos, arcade e projetos independentes.',
        status: 'ATIVO',
      },
    ],
  },
  {
    id: 'web',
    name: 'Interação e Web',
    items: [
      {
        id: 'react',
        name: 'React',
        glyph: 'hex',
        description: 'Interfaces reativas para a web.',
        use: 'construção de interfaces reativas e componentizadas.',
        application: 'HUDs web, painéis, sites de jogos e ferramentas internas.',
        status: 'ATIVO',
      },
      {
        id: 'typescript',
        name: 'TypeScript',
        glyph: 'circle',
        description: 'Tipagem estática para escalar.',
        use: 'tipagem estática para bases de código que crescem sem medo.',
        application: 'toda a camada web e ferramentas de produção da Tenka.',
        status: 'ATIVO',
      },
      {
        id: 'threejs',
        name: 'Three.js',
        glyph: 'triangle',
        description: 'Mundos 3D no navegador.',
        use: 'experiências tridimensionais em tempo real no navegador.',
        application: 'sites interativos, visualizadores, mundos WebGL e interfaces espaciais.',
        status: 'ATIVO',
      },
      {
        id: 'webgl',
        name: 'WebGL',
        glyph: 'diamond',
        description: 'Renderização acelerada na web.',
        use: 'renderização 3D acelerada por GPU direto no browser.',
        application: 'shaders, distorções, campos de partículas e cenas leves.',
        status: 'EM USO',
      },
    ],
  },
  {
    id: 'art',
    name: 'Arte e Interface',
    items: [
      {
        id: 'blender',
        name: 'Blender',
        glyph: 'diamond',
        description: 'Modelagem, animação e lookdev.',
        use: 'modelagem, animação e lookdev de assets próprios.',
        application: 'personagens, ambientes e props para todos os mundos.',
        status: 'ATIVO',
      },
      {
        id: 'figma',
        name: 'Figma',
        glyph: 'square',
        description: 'UI, wireframes e protótipos.',
        use: 'design de interface, wireframes e protótipos navegáveis.',
        application: 'HUDs, menus, fluxos e sistemas de UI antes do código.',
        status: 'ATIVO',
      },
      {
        id: 'substance',
        name: 'Substance',
        glyph: 'hex',
        description: 'Materiais e texturização.',
        use: 'autoria de materiais e texturas físicas.',
        application: 'superfícies metálicas, orgânicas e desgaste de ambientes.',
        status: 'EM USO',
      },
    ],
  },
  {
    id: 'systems',
    name: 'Sistemas',
    items: [
      {
        id: 'nodejs',
        name: 'Node.js',
        glyph: 'hex',
        description: 'Backends e serviços de apoio.',
        use: 'serviços de backend, matchmaking e ferramentas de build.',
        application: 'servidores de jogo, APIs internas e automações.',
        status: 'ATIVO',
      },
      {
        id: 'apis',
        name: 'APIs',
        glyph: 'circle',
        description: 'Integração com plataformas.',
        use: 'integração com lojas, plataformas e serviços externos.',
        application: 'Steam, autenticação, telemetria e economia de jogo.',
        status: 'EM USO',
      },
      {
        id: 'cloud',
        name: 'Cloud',
        glyph: 'square',
        description: 'Infraestrutura escalável.',
        use: 'infraestrutura elástica para builds, dados e multiplayer.',
        application: 'CI/CD, hospedagem de experiências web e telemetria.',
        status: 'EM USO',
      },
    ],
  },
  {
    id: 'experimental',
    name: 'Experimentação',
    items: [
      {
        id: 'gen-ai',
        name: 'IA Generativa',
        glyph: 'diamond',
        description: 'Apoio à concepção e variação.',
        use: 'apoio à produção de conceito e variação de conteúdo.',
        application: 'moodboards, rascunhos e comportamento de personagens.',
        status: 'PESQUISA',
      },
      {
        id: 'procedural',
        name: 'Sistemas Procedurais',
        glyph: 'triangle',
        description: 'Conteúdo gerado por regras.',
        use: 'geração de mundos, mapas e variações por regras.',
        application: 'terrenos, layouts de missão e economia dinâmica.',
        status: 'PESQUISA',
      },
      {
        id: 'realtime',
        name: 'Ferramentas Real-time',
        glyph: 'circle',
        description: 'Iteração e preview ao vivo.',
        use: 'preview e ajuste de sistemas em tempo real.',
        application: 'balanceamento, tuning de shaders e playtests dirigidos.',
        status: 'EM USO',
      },
    ],
  },
];
