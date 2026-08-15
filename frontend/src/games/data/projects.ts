export interface WorldProject {
  id: string;
  title: string;
  category: string;
  year: string;
  description: string;
  status: string;
  technologies: string[];
  /** Key art plus the colour bed it sits on. `src` is the real art; the
   *  gradient/glow trio stays as the backdrop that paints the frame while the
   *  image decodes (and remains visible if it ever fails to load). */
  image: { src: string; from: string; to: string; glow: string; alt: string };
  videoUrl?: string;
  /** Drives the DOM card border, world node and Core relight. */
  accent: string;
  /** Ambient tint painted behind the whole section for this world. */
  atmosphere: string;
}

/** Os universos originais da Tenka Games, na ordem em que aparecem na
 *  identidade visual ("UNIVERSOS EM DESTAQUE"). */
export const WORLD_PROJECTS: WorldProject[] = [
  {
    id: 'eclipse-primordial',
    title: 'Eclipse Primordial',
    category: 'Aventura de sobrevivência',
    year: '2026',
    description:
      'Um mundo à beira do colapso, sob um eclipse que não termina. Escolhas moldam o que resta — e o que resta define quem você se torna.',
    status: 'EM PRODUÇÃO',
    technologies: ['Unreal Engine 5', 'Niagara', 'Houdini', 'Wwise'],
    image: {
      src: '/images/games/project-eclipse.png',
      from: '#1a0800',
      to: '#7a2a05',
      glow: '#ff9a2e',
      alt: 'Key art de Eclipse Primordial: um vale de rocha vulcânica com rios de lava e um eclipse em coroa alaranjada no céu, com uma figura solitária em primeiro plano',
    },
    accent: '#FF8A1F',
    atmosphere: '#2a1003',
  },
  {
    id: 'fronteira-silenciada',
    title: 'Fronteira Silenciada',
    category: 'Ficção científica narrativa',
    year: '2026',
    description:
      'Após o contato, nada volta a ser como antes. Monolitos silenciosos marcam a fronteira de um território que aprendeu a responder.',
    status: 'PROTÓTIPO JOGÁVEL',
    technologies: ['Unity 6', 'C#', 'Shader Graph', 'FMOD'],
    image: {
      src: '/images/games/project-fronteira.png',
      from: '#0d1116',
      to: '#3a4048',
      glow: '#c2ced9',
      alt: 'Key art de Fronteira Silenciada: monolitos colossais de pedra escura sob um céu carregado, com veios de brasa alaranjada na base e uma figura caminhando ao longe',
    },
    accent: '#A8B6C4',
    atmosphere: '#121820',
  },
  {
    id: 'coracoes-de-ferro',
    title: 'Corações de Ferro',
    category: 'RPG de ação',
    year: '2025',
    description:
      'Entre máquinas e memória, o que significa ser humano? Uma cidade-fundição mantém acesa a consciência que um dia a projetou.',
    status: 'EM PESQUISA',
    technologies: ['Unreal Engine 5', 'Blueprints', 'Blender', 'Wwise'],
    image: {
      src: '/images/games/project-coracoes-ferro.png',
      from: '#180a05',
      to: '#6e2408',
      glow: '#ff7a1f',
      alt: 'Key art de Corações de Ferro: uma cabeça mecânica gigante com núcleo circular incandescente sobre uma cidade-fundição industrial, observada por uma figura humana',
    },
    accent: '#FF4D00',
    atmosphere: '#26100a',
  },
];
