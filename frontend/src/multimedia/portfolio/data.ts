/**
 * Estúdio aberto da TENKA Studios. Textos tirados dos próprios projetos
 * (Innovation Week: innovation-week/frontend; Casa Views: Freelandoo) — nada
 * inventado. Assets em public/portfolio/studios/.
 */
import type { StageBackdrop } from './holoStage';

const ROOT = '/portfolio/studios';

export interface LabelChapter {
  id: string;
  /** Trecho do vídeo (0..1) em que o capítulo está no ar. */
  from: number;
  to: number;
  kicker: string;
  title: string;
  text: string;
  still: string;
}

/**
 * A animação real do rótulo (a landing da Innovation Week), capturada quadro a
 * quadro: a rolagem do visitante dirige o vídeo. Limites medidos nas cenas da
 * landing (hero, rg, surface, lights, layers, qr).
 */
export const LABEL_VIDEO = `${ROOT}/rotulo-scrub.mp4`;
export const LABEL_POSTER = `${ROOT}/rotulo-poster.webp`;

export const LABEL_CHAPTERS: LabelChapter[] = [
  {
    id: 'personagem',
    from: 0,
    to: 0.09,
    kicker: '01 · PERSONAGEM',
    title: 'O astronauta sai do rótulo.',
    text: 'A figura da arte impressa vira um modelo 3D de verdade. É o mesmo personagem do rótulo, do site, da realidade aumentada e do jogo.',
    still: `${ROOT}/rotulo-poster.webp`,
  },
  {
    id: 'rg',
    from: 0.09,
    to: 0.18,
    kicker: '02 · GÊMEO DIGITAL',
    title: 'Sua embalagem tem um RG.',
    text: 'O rótulo foi recriado em 3D na medida real da faca de corte. Cada unidade carrega uma identidade própria — e é ela que a página reconhece.',
    still: `${ROOT}/rotulo-poster.webp`,
  },
  {
    id: 'superficie',
    from: 0.18,
    to: 0.41,
    kicker: '03 · ANÁLISE DE SUPERFÍCIE',
    title: 'Luz rasante. Superfície revelada.',
    text: 'Um scanner varre o rótulo e acende cada acabamento onde ele está de fato impresso: luminescente no padrão INNOVATION WAY, relevo nas molduras e na armadura, holográfico no céu, planeta e solo, textura na estrutura da nave.',
    still: `${ROOT}/rotulo-superficie.webp`,
  },
  {
    id: 'escuro',
    from: 0.41,
    to: 0.65,
    kicker: '04 · TESTE DE LUZ',
    title: 'Quando a luz apaga, a energia fica.',
    text: 'O verniz fotoluminescente absorve luz e continua brilhando no escuro por alguns segundos. A página simula a carga, o apagão e o brilho residual.',
    still: `${ROOT}/rotulo-escuro.webp`,
  },
  {
    id: 'camadas',
    from: 0.65,
    to: 0.88,
    kicker: '05 · VISTA EXPLODIDA',
    title: 'Não é apenas impressão.',
    text: 'As separações do arquivo de gráfica se afastam uma da outra, na ordem em que vão para a máquina. Cada camada é um acabamento — e cada uma tem função na história.',
    still: `${ROOT}/rotulo-camadas.webp`,
  },
  {
    id: 'qr',
    from: 0.88,
    to: 1,
    kicker: '06 · IDENTIDADE',
    title: 'Um QR. Uma identidade. Uma experiência.',
    text: 'O QR impresso carrega produto, lote e unidade no padrão GS1. É ele que abre a experiência daquela embalagem específica: cadastro, área do membro, coleção e ranking.',
    still: `${ROOT}/rotulo-qr.webp`,
  },
];

/** As separações de impressão, da base para a frente (labelConfig.ts → explodedOrder). */
export const LABEL_LAYERS: { label: string; tech: string }[] = [
  { label: 'Arte impressa', tech: 'astronauta, planeta e nave' },
  { label: 'Calço branco', tech: 'base dos logos, textos e QR' },
  { label: 'Verniz textura', tech: 'estrutura metálica da nave' },
  { label: 'Verniz relevo', tech: 'molduras e placas da armadura' },
  { label: 'Casting holográfico', tech: 'céu, planeta e solo' },
  { label: 'Verniz luminescente', tech: 'padrão INNOVATION WAY' },
  { label: 'Verniz fotoluminescente', tech: 'logos e armadura no escuro' },
];

export interface HoloProject {
  id: 'innovation-week' | 'casa-views';
  name: string;
  client: string;
  character: string;
  model: string;
  faceFront: number;
  color: string;
  accent: string;
  backdrop: StageBackdrop & { src: string; small: string };
  target: { src: string; alt: string };
  intro: string;
  steps: { title: string; text: string }[];
}

export const HOLO_PROJECTS: HoloProject[] = [
  {
    id: 'innovation-week',
    name: 'Innovation Week',
    client: 'Embalagem com identidade digital',
    character: 'O astronauta',
    model: `${ROOT}/holo/astronauta.glb`,
    faceFront: 0,
    color: '#ff1a1a',
    accent: '#ffd2cc',
    backdrop: { src: `${ROOT}/holo/chamber.webp`, small: `${ROOT}/holo/chamber-1024.webp`, w: 1672, h: 941, feetX: 837, feetY: 563, figure: 400 },
    target: { src: `${ROOT}/holo/rotulo-alvo.webp`, alt: 'Rótulo Innovation Week, o alvo que a câmera reconhece' },
    intro:
      'Aponte o celular para o rótulo e o astronauta aparece de pé sobre ele, em tamanho real. Depois, ele entra na coleção da sua área de membro — é esta câmara branca.',
    steps: [
      { title: 'O rótulo é o alvo', text: 'A própria arte impressa é rastreada pela câmera (MindAR). Não precisa de marcador extra nem de app.' },
      { title: 'Holograma em escala real', text: 'O astronauta surge com 1,8 m sobre a embalagem: shader próprio com fresnel, scanlines, glitch e materialização de baixo para cima.' },
      { title: 'Colecionar', text: 'Uma linha sobe pelo corpo e o holograma vira o modelo com textura. Ele vai para a vitrine do membro.' },
    ],
  },
  {
    id: 'casa-views',
    name: 'Casa Views',
    client: 'Reality social em tempo real',
    character: 'O Lutador do Coliseu',
    model: `${ROOT}/holo/sergio-ra.glb`,
    faceFront: 0,
    color: '#ff2b91',
    accent: '#ffd1e8',
    backdrop: { src: `${ROOT}/holo/coliseu.webp`, small: `${ROOT}/holo/coliseu-1024.webp`, w: 1672, h: 941, feetX: 836, feetY: 548, figure: 380 },
    target: { src: `${ROOT}/holo/muay-thai.webp`, alt: 'Figura impressa do Lutador do Coliseu, o alvo da realidade aumentada' },
    intro:
      'O mesmo motor de holograma, agora rosa. A câmera reconhece a figura impressa do lutador de Muay Thai do Coliseu, e quem coleciona o vê se materializar no pedestal.',
    steps: [
      { title: 'A figura impressa', text: 'A arte do Sérgio, lutador do Coliseu, é o alvo da câmera. Edição de estreia: holograma 001.' },
      { title: 'Colecionar por R$ 1,99', text: 'O botão leva ao Mercado Pago. Na volta, a página confirma o pagamento com o servidor antes de liberar o personagem.' },
      { title: 'No pedestal do Coliseu', text: 'O holograma pisa no pedestal, a linha sobe com a textura e ele entra numa vitrine de 6 posições — as outras aparecem trancadas, esperando o próximo drop.' },
    ],
  },
];

