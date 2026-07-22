/**
 * Projetos do portfólio "channel surfing". Conteúdo placeholder pensado para
 * ser substituído por mídia real: troque `images`/`video` por caminhos de
 * assets e mantenha o restante da estrutura.
 */
export interface MultimediaProject {
  id: string;
  title: string;
  channel: string;
  channelNumber: string;
  category: string;
  concept: string;
  format: string;
  platforms: string[];
  audience: string;
  production: string[];
  results?: string[];
  images: string[];
  video?: string;
  /** [dominante, apoio, destaque] — assume o palco enquanto o canal está no ar. */
  palette: [string, string, string];
  typographyStyle: 'display' | 'cond' | 'stamp';
}

export const PROJECTS: MultimediaProject[] = [
  {
    id: 'pulse-social',
    title: 'PULSE SOCIAL',
    channel: 'SOCIAL',
    channelNumber: '01',
    category: 'Campanha de redes sociais',
    concept:
      'Uma campanha construída para transformar lançamento em conversa diária, combinando Reels, Stories, carrosséis e participação do público.',
    format: 'Série de conteúdo diário — 6 semanas no ar',
    platforms: ['Instagram', 'TikTok'],
    audience: 'Público jovem urbano, 18–29, que decide o que assiste em 2 segundos.',
    production: ['Direção de conteúdo', 'Roteiro', 'Captação vertical', 'Motion', 'Comunidade'],
    results: ['Conversa diária sustentada durante o lançamento', 'Público participando com conteúdo próprio'],
    images: ['pulse-01', 'pulse-02', 'pulse-03'],
    palette: ['#ff2e88', '#ff6047', '#ffd84d'],
    typographyStyle: 'cond',
  },
  {
    id: 'night-shift',
    title: 'NIGHT SHIFT',
    channel: 'CAMPANHA',
    channelNumber: '02',
    category: 'Campanha audiovisual',
    concept:
      'Uma identidade cinematográfica criada para apresentar uma marca através de luz, ritmo, personagens e narrativa.',
    format: 'Filme-manifesto + desdobramentos em social e OOH',
    platforms: ['YouTube', 'Instagram', 'Evento presencial'],
    audience: 'Quem trabalha, cria e vive depois do expediente.',
    production: ['Conceito', 'Direção', 'Fotografia noturna', 'Trilha original', 'Finalização de cor'],
    results: ['A marca passou a ser reconhecida pela linguagem visual da campanha'],
    images: ['night-01', 'night-02', 'night-03'],
    video: 'night-shift-teaser',
    palette: ['#a90e19', '#1b0a2e', '#ff6047'],
    typographyStyle: 'display',
  },
  {
    id: 'voice-of-the-city',
    title: 'VOICE OF THE CITY',
    channel: 'VÍDEO',
    channelNumber: '03',
    category: 'Entrevistas e conteúdo urbano',
    concept:
      'Uma série audiovisual baseada em personagens, histórias locais e diferentes perspectivas sobre a cidade.',
    format: 'Série documental — 8 episódios + cortes verticais',
    platforms: ['YouTube', 'Instagram', 'TikTok'],
    audience: 'Quem reconhece a própria rua quando ela aparece na tela.',
    production: ['Pesquisa de personagens', 'Entrevistas', 'Captação em locação', 'Edição', 'Cortes sociais'],
    images: ['voice-01', 'voice-02', 'voice-03'],
    video: 'voice-ep-01',
    palette: ['#2563eb', '#0b1220', '#ffd84d'],
    typographyStyle: 'stamp',
  },
  {
    id: 'live-arena',
    title: 'LIVE ARENA',
    channel: 'ENTRETENIMENTO',
    channelNumber: '05',
    category: 'Entretenimento e formato original',
    concept:
      'Um programa competitivo construído para integrar participantes, público, conteúdo social e transmissão.',
    format: 'Formato original — temporada de 10 episódios ao vivo',
    platforms: ['YouTube', 'TikTok', 'Evento presencial'],
    audience: 'Plateia que quer participar do resultado, não só assistir.',
    production: ['Desenho de formato', 'Cenografia', 'Transmissão multicâmera', 'Dinâmica de votação', 'Social em tempo real'],
    results: ['Formato replicável em novas temporadas e praças'],
    images: ['arena-01', 'arena-02', 'arena-03'],
    video: 'arena-highlights',
    palette: ['#ff2929', '#050203', '#ffd84d'],
    typographyStyle: 'cond',
  },
  {
    id: 'new-signal',
    title: 'NEW SIGNAL',
    channel: 'IDENTIDADE',
    channelNumber: '04',
    category: 'Identidade e lançamento',
    concept:
      'Uma campanha de reposicionamento que transforma a nova identidade em vídeo, social, fotografia e peças editoriais.',
    format: 'Sistema de identidade + campanha de lançamento integrada',
    platforms: ['Instagram', 'LinkedIn', 'Múltiplas plataformas'],
    audience: 'Mercado que conhecia a marca antiga e precisava reaprender a lê-la.',
    production: ['Identidade visual', 'Sistema tipográfico', 'Fotografia de marca', 'Filme de lançamento', 'Kit editorial'],
    results: ['Identidade adotada em todos os pontos de contato em 3 meses'],
    images: ['signal-01', 'signal-02', 'signal-03'],
    palette: ['#0ea5a3', '#052426', '#fff8f2'],
    typographyStyle: 'display',
  },
];

/** Ordem dos canais na TV do portfólio. */
export const CHANNELS = [
  { number: '01', name: 'SOCIAL', projectId: 'pulse-social' },
  { number: '02', name: 'CAMPANHA', projectId: 'night-shift' },
  { number: '03', name: 'VÍDEO', projectId: 'voice-of-the-city' },
  { number: '04', name: 'IDENTIDADE', projectId: 'new-signal' },
  { number: '05', name: 'ENTRETENIMENTO', projectId: 'live-arena' },
] as const;

export function projectById(id: string): MultimediaProject {
  const project = PROJECTS.find((p) => p.id === id);
  if (!project) throw new Error(`Projeto desconhecido: ${id}`);
  return project;
}
