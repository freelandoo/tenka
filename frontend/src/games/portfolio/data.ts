/**
 * Conteúdo do portfólio jogável da TENKA Games. Números medidos nos próprios
 * arquivos (contagem de triângulos dos .glb, tamanhos de download) ou tirados
 * dos relatórios do projeto EVO BRAZIL — nada estimado.
 *
 * Assets: public/portfolio/games/ (derivados web; os originais ficam no projeto
 * do jogo). Modelos comprimidos com gltf-transform (meshopt + WebP 1024).
 */

const ROOT = '/portfolio/games';

export type PipelineStep = 'conceito' | 'escultura' | 'malha' | 'textura' | 'combate';

export interface PipelineStage {
  id: PipelineStep;
  index: string;
  label: string;
  title: string;
  explanation: string;
}

export const PIPELINE: PipelineStage[] = [
  {
    id: 'conceito',
    index: '01',
    label: 'CONCEITO',
    title: 'Tudo começa no papel.',
    explanation:
      'Arte 2D define personalidade, silhueta e paleta. As folhas de modelo separam cabeça, corpo, capuz, pernas e arma em vistas de frente e de lado — o mapa que guia o 3D.',
  },
  {
    id: 'escultura',
    index: '02',
    label: 'ESCULTURA',
    title: 'Forma pura, sem textura.',
    explanation:
      'O boneco em argila. Sem cor para distrair, é aqui que se julga proporção, leitura de silhueta a distância e se a pose comunica quem o personagem é.',
  },
  {
    id: 'malha',
    index: '03',
    label: 'MALHA',
    title: 'A geometria que o jogo desenha.',
    explanation:
      'Cada triângulo custa desempenho. A malha é limpa e reduzida até o ponto em que o personagem roda liso no navegador e no celular sem perder a forma.',
  },
  {
    id: 'textura',
    index: '04',
    label: 'TEXTURA',
    title: 'Cor, material e luz.',
    explanation:
      'Mapas de cor, normal e rugosidade dão pele, tecido e metal. Para a web, as texturas saem de 4096 para 1024 px em WebP — o mesmo personagem, uma fração do peso.',
  },
  {
    id: 'combate',
    index: '05',
    label: 'EM COMBATE',
    title: 'Rig, animação e jogo.',
    explanation:
      'Esqueleto, pesos e animações transformam o modelo em lutador: combo de cinco golpes, guarda, saque, corrida e queda — os mesmos clipes que rodam no EVO BRAZIL.',
  },
];

export interface Fighter {
  id: string;
  name: string;
  role: string;
  description: string;
  model: string;
  /** Triângulos medidos no .glb exibido aqui. */
  triangles: number;
  /** Otimização para celular registrada no projeto (mil triângulos), quando houver. */
  mobileCut?: { from: number; to: number };
  /** Arte 2D de conceito (vazio = etapa CONCEITO desativada para este lutador). */
  concept: string[];
  /** Miniatura da seleção de lutadores. */
  thumb: string;
  accent: string;
  /** Multiplica a altura no palco quando a arma erguida domina a caixa do modelo. */
  scale?: number;
  /** Clipes de combate na ordem do combo (só quem tem animação). */
  combo?: string[];
  idle?: string;
}

export const FIGHTERS: Fighter[] = [
  {
    id: 'cat-demon',
    name: 'Cat Demon',
    role: 'Lutador 01 · Experiente',
    description:
      'Pequeno, rápido e armado com uma lâmina maior que ele. Fecha distância num passo e cobra caro por cada erro de espaçamento.',
    model: `${ROOT}/models/catdemon_jogo.glb`,
    triangles: 41213,
    thumb: `${ROOT}/lab/sheet-full.webp`,
    concept: [
      `${ROOT}/lab/sheet-full.webp`,
      `${ROOT}/lab/sheet-head-front.webp`,
      `${ROOT}/lab/sheet-head-side.webp`,
      `${ROOT}/lab/sheet-hood-front.webp`,
      `${ROOT}/lab/sheet-hood-side.webp`,
      `${ROOT}/lab/sheet-lanca.webp`,
    ],
    accent: '#ff2e63',
    combo: ['atk1', 'atk2', 'atk3', 'atk4', 'atk5'],
    idle: 'idle',
  },
  {
    id: 'gata',
    name: 'A Gata',
    role: 'Lutadora 02',
    description: 'Leve e precisa. Na versão de luta a malha caiu de 25,7 mil para 11,4 mil triângulos sem mudar a leitura do corpo.',
    model: `${ROOT}/models/gata.glb`,
    triangles: 8038,
    mobileCut: { from: 25.7, to: 11.4 },
    concept: [`${ROOT}/lab/retrato-gata.webp`],
    thumb: `${ROOT}/lab/retrato-gata.webp`,
    accent: '#f4d7ff',
  },
  {
    id: 'raposa-fogo',
    name: 'Raposa de Fogo',
    role: 'Lutadora 03',
    description: 'Luta com o rabo: A RABADA, o golpe-assinatura dela, é um clipe de animação próprio dentro do modelo — é ele que roda aqui.',
    model: `${ROOT}/models/raposa_fogo.glb`,
    triangles: 7904,
    concept: [`${ROOT}/lab/retrato-raposa-fogo.webp`],
    thumb: `${ROOT}/lab/retrato-raposa-fogo.webp`,
    accent: '#ffb02e',
    combo: ['rabada'],
  },
  {
    id: 'cat-demon-adulto',
    name: 'Cat Demon Adulto',
    role: 'Lutador 04',
    description: 'Mais alto e pesado que o Cat Demon, com outro alcance e outro ritmo de luta. Para o celular, 36,9 mil triângulos viraram 14,5 mil.',
    model: `${ROOT}/models/catdemon_adulto.glb`,
    triangles: 14546,
    mobileCut: { from: 36.9, to: 14.5 },
    scale: 1.3,
    concept: [],
    thumb: `${ROOT}/lab/thumb-catdemon-adulto.webp`,
    accent: '#ff4d2e',
  },
  {
    id: 'baby',
    name: 'Baby Cat Demon',
    role: 'Lutador 05',
    description: 'Pequeno no corpo, grande na arma. A lança sozinha tinha 20 mil triângulos — o modelo inteiro de celular ficou com 10,4 mil.',
    model: `${ROOT}/models/catdemon_baby.glb`,
    triangles: 10382,
    mobileCut: { from: 31.7, to: 10.4 },
    concept: [],
    thumb: `${ROOT}/lab/thumb-catdemon-baby.webp`,
    accent: '#ff8a8a',
  },
];

export interface EvoShot {
  id: string;
  src: string;
  video?: string;
  chapter: string;
  title: string;
  caption: string;
  stat?: { value: string; label: string };
}

export const EVO_SHOTS: EvoShot[] = [
  {
    id: 'abertura',
    src: `${ROOT}/evo/abertura.webp`,
    video: `${ROOT}/evo/abertura.mp4`,
    chapter: 'ATMOSFERA',
    title: 'Um templo em chamas sob a lua.',
    caption:
      'A direção de arte nasce antes do primeiro polígono: torii, lanternas, cerejeiras e névoa definem o tom de tudo o que vem depois.',
  },
  {
    id: 'selecao',
    src: `${ROOT}/evo/selecao.webp`,
    video: `${ROOT}/evo/selecao.mp4`,
    chapter: 'INTERFACE',
    title: 'Escolha seu lutador.',
    caption:
      'Seleção com o lutador em 3D no palco, atributos, missões do dia e créditos. UI desenhada para teclado, controle e toque.',
    stat: { value: '6', label: 'lutadores na seleção' },
  },
  {
    id: 'arena-geral',
    src: `${ROOT}/evo/arena-geral.webp`,
    chapter: 'LEVEL DESIGN',
    title: 'A arena vista de cima.',
    caption:
      'Muralhas, pátios e pagodes posicionados para criar rotas, esconderijos e linhas de visão. O mapa é planejado como um tabuleiro antes de virar cenário.',
  },
  {
    id: 'kit-cenario',
    src: `${ROOT}/evo/kit-cenario.webp`,
    chapter: 'KIT DE CENÁRIO',
    title: 'Peças que montam um mundo.',
    caption:
      'Torii, portão, pagodes, templo, pilastra, colina e muralha nascem como folhas de referência e viram módulos 3D reaproveitáveis — a arena inteira é montada com eles.',
  },
  {
    id: 'arena-portao',
    src: `${ROOT}/evo/arena-portao.webp`,
    chapter: 'LEVEL DESIGN',
    title: 'O portão principal.',
    caption: 'Escala medida pelo lutador: o portão enquadra o personagem e anuncia a entrada na arena.',
  },
  {
    id: 'vale-onsen',
    src: `${ROOT}/evo/vale-onsen.webp`,
    chapter: 'ILUMINAÇÃO',
    title: 'O vale à noite.',
    caption: 'Luz quente das lanternas contra o azul da noite. A iluminação guia o olhar do jogador até o próximo ponto de interesse.',
  },
  {
    id: 'combo',
    src: `${ROOT}/evo/combo.webp`,
    chapter: 'COMBATE',
    title: 'O combo que sobe na tela.',
    caption: 'Contador de golpes, tempo de partida e barra de vida — informação lida num relance, sem tirar o olho da luta.',
  },
  {
    id: 'torneio',
    src: `${ROOT}/evo/torneio.webp`,
    chapter: 'ENGENHARIA',
    title: 'Pesado por fora, leve por dentro.',
    caption:
      'Na arena do modo VALENDO, as primitivas desenhadas por quadro caíram de 1 milhão para 371 mil. O download do celular foi de 230 MB para 157 MB.',
    stat: { value: '−63%', label: 'primitivas por quadro' },
  },
];

export const EVO_FACTS: { value: string; label: string }[] = [
  { value: 'Godot 4.7', label: 'motor (GL Compatibility)' },
  { value: 'Web + Android', label: 'plataformas' },
  { value: '60 Hz', label: 'servidor autoritativo da arena multiplayer' },
  { value: '1 M → 371 mil', label: 'primitivas por quadro na arena' },
];
