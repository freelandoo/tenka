export interface WorldProject {
  id: string;
  title: string;
  category: string;
  year: string;
  description: string;
  status: string;
  technologies: string[];
  /** Layered placeholder media — reads as an intentional key art, not a flat
   *  rectangle: a diagonal base gradient plus a radial "horizon" light. */
  image: { from: string; to: string; glow: string; alt: string };
  videoUrl?: string;
  /** Drives the DOM card border, world node and Core relight. */
  accent: string;
  /** Ambient tint painted behind the whole section for this world. */
  atmosphere: string;
}

export const WORLD_PROJECTS: WorldProject[] = [
  {
    id: 'projeto-aurora',
    title: 'Projeto Aurora',
    category: 'Aventura narrativa',
    year: '2025',
    description:
      'Uma jornada narrativa por um planeta em transformação, onde cada decisão altera o equilíbrio entre memória, tecnologia e sobrevivência.',
    status: 'EM PRODUÇÃO',
    technologies: ['Unity', 'C#', 'Shader Graph', 'FMOD'],
    image: {
      from: '#081a2e',
      to: '#2f6d8f',
      glow: '#9fe6ff',
      alt: 'Prévia do Projeto Aurora: paisagem glacial e alienígena com estruturas monumentais e luz quente no horizonte',
    },
    accent: '#7FD3F2',
    atmosphere: '#0a2436',
  },
  {
    id: 'sector-nine',
    title: 'Sector Nine',
    category: 'Ação tática',
    year: '2024',
    description:
      'Combate tático e exploração em uma estação isolada, controlada por sistemas que já não obedecem aos seus criadores.',
    status: 'PROTÓTIPO JOGÁVEL',
    technologies: ['Unreal Engine', 'Blueprints', 'Houdini'],
    image: {
      from: '#2a0a06',
      to: '#7a1608',
      glow: '#ff5a2e',
      alt: 'Prévia de Sector Nine: corredores metálicos de uma estação sob luz vermelha de emergência',
    },
    accent: '#FF4D2E',
    atmosphere: '#2a0805',
  },
  {
    id: 'neon-strikers',
    title: 'Neon Strikers',
    category: 'Esporte arcade',
    year: '2024',
    description:
      'Um esporte de alta velocidade que mistura precisão, estratégia de equipe e arenas que mudam durante a partida.',
    status: 'LANÇADO',
    technologies: ['Godot', 'GDScript', 'Blender'],
    image: {
      from: '#1a0530',
      to: '#8a1fb0',
      glow: '#ff5cf0',
      alt: 'Prévia de Neon Strikers: arena urbana iluminada por magenta e ciano elétricos com trilhas de velocidade',
    },
    accent: '#E85CFF',
    atmosphere: '#1a0530',
  },
  {
    id: 'the-last-signal',
    title: 'The Last Signal',
    category: 'Terror e investigação',
    year: '2025',
    description:
      'Uma transmissão impossível leva o jogador a investigar uma instalação abandonada onde o sinal parece conhecer quem o escuta.',
    status: 'EM PESQUISA',
    technologies: ['Unreal Engine', 'Wwise', 'Web Audio API'],
    image: {
      from: '#02120c',
      to: '#0c3a24',
      glow: '#57ffab',
      alt: 'Prévia de The Last Signal: uma estação de sinal escura com telas monocromáticas verdes e uma silhueta distante',
    },
    accent: '#57FFAB',
    atmosphere: '#04160e',
  },
];
