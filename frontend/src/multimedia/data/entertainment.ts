/** Formatos de entretenimento apresentados como grade de programação. */
export type FormatStatus =
  | 'AO VIVO'
  | 'NOVA TEMPORADA'
  | 'EM PRODUÇÃO'
  | 'FORMATO ORIGINAL'
  | 'EM DESENVOLVIMENTO';

export interface EntertainmentFormat {
  id: string;
  title: string;
  type: string;
  status: FormatStatus;
  concept: string;
  participation: string;
  distribution: string[];
  /** Horário fictício na grade — linguagem de canal de TV. */
  slot: string;
  accent: string;
}

export const ENTERTAINMENT_FORMATS: EntertainmentFormat[] = [
  {
    id: 'reality',
    title: 'CASA ABERTA',
    type: 'Reality',
    status: 'NOVA TEMPORADA',
    concept: 'Convivência, provas e eliminação decididas junto com a audiência.',
    participation: 'Votação ao vivo e enquetes definem o rumo de cada episódio.',
    distribution: ['Transmissão ao vivo', 'Cortes diários', 'Social 24h'],
    slot: '20H30',
    accent: '#ff2e88',
  },
  {
    id: 'entrevista',
    title: 'CADEIRA QUENTE',
    type: 'Entrevista',
    status: 'AO VIVO',
    concept: 'Conversas longas com perguntas enviadas pelo público em tempo real.',
    participation: 'A plateia digital escolhe o próximo bloco de perguntas.',
    distribution: ['YouTube', 'Podcast', 'Cortes verticais'],
    slot: '21H00',
    accent: '#ff2929',
  },
  {
    id: 'programa',
    title: 'TURNO DA NOITE',
    type: 'Programa',
    status: 'FORMATO ORIGINAL',
    concept: 'Variedades, música e quadros gravados com plateia presente.',
    participation: 'Plateia presencial participa dos quadros e desafios.',
    distribution: ['Gravação com plateia', 'Episódios semanais', 'Social'],
    slot: '22H15',
    accent: '#ff6047',
  },
  {
    id: 'serie',
    title: 'RETRATOS',
    type: 'Série',
    status: 'EM PRODUÇÃO',
    concept: 'Personagens reais e histórias locais em temporadas curtas.',
    participation: 'O público indica personagens e locações da próxima temporada.',
    distribution: ['YouTube', 'Festivais', 'Cortes sociais'],
    slot: 'SÁB 19H',
    accent: '#2563eb',
  },
  {
    id: 'podcast',
    title: 'FREQUÊNCIA',
    type: 'Podcast',
    status: 'AO VIVO',
    concept: 'Cultura, música e conversa gravadas em estúdio aberto.',
    participation: 'Chat ao vivo entra no ar durante os blocos.',
    distribution: ['Áudio', 'Vídeo', 'Cortes'],
    slot: 'DIÁRIO 18H',
    accent: '#0ea5a3',
  },
  {
    id: 'competicao',
    title: 'BATALHA DE CRIAÇÃO',
    type: 'Competição',
    status: 'NOVA TEMPORADA',
    concept: 'Criadores disputam briefings reais contra o relógio.',
    participation: 'Júri técnico + voto popular valendo 50% do resultado.',
    distribution: ['Transmissão ao vivo', 'Bastidores', 'Social'],
    slot: 'QUI 20H',
    accent: '#ffd84d',
  },
  {
    id: 'desafio',
    title: 'MISSÃO 48H',
    type: 'Desafio',
    status: 'EM DESENVOLVIMENTO',
    concept: 'Uma missão impossível de produção executada em 48 horas.',
    participation: 'A audiência sugere as missões e acompanha os bastidores.',
    distribution: ['Vertical diário', 'Episódio final', 'Bastidores'],
    slot: 'MENSAL',
    accent: '#ff2e88',
  },
  {
    id: 'evento',
    title: 'PALCO CENTRAL',
    type: 'Evento',
    status: 'FORMATO ORIGINAL',
    concept: 'Experiência presencial com transmissão e cobertura integrada.',
    participation: 'Quem está em casa interage com o que acontece no palco.',
    distribution: ['Evento presencial', 'Live', 'Aftermovie'],
    slot: 'TEMPORADA',
    accent: '#a90e19',
  },
  {
    id: 'aovivo',
    title: 'SINAL ABERTO',
    type: 'Conteúdo ao vivo',
    status: 'AO VIVO',
    concept: 'Coberturas, estreias e plantões transmitidos sem cortes.',
    participation: 'Comentários moderados aparecem na tela em tempo real.',
    distribution: ['Live multiplataforma', 'Resumos', 'Cortes'],
    slot: 'ESCALADO',
    accent: '#ff2929',
  },
  {
    id: 'interativo',
    title: 'VOCÊ DECIDE',
    type: 'Formato interativo',
    status: 'EM DESENVOLVIMENTO',
    concept: 'Narrativa ramificada em que cada episódio é votado pelo público.',
    participation: 'Enquetes decidem o roteiro do episódio seguinte.',
    distribution: ['Stories', 'YouTube', 'Comunidade'],
    slot: 'PILOTO',
    accent: '#ffd84d',
  },
];
