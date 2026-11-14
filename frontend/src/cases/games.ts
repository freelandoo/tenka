import type { CaseStudy } from './types';

const MM = '/portfolio/works/games';
const PG = '/portfolio/games';

/**
 * Bastidores dos jogos (fatias G1–G3). Só modelo, print, vídeo e técnica —
 * nenhum build jogável do Meu Mundo nem do EVO (exceção do Alex: o Astronauta,
 * que já é jogável na Innovation Week).
 */

/** Meu Mundo 3D. Fonte: `freelandoo/MEU MUNDO 3D` (pipeline, REGISTRO, fotos) e o front `features/meu-mundo`. */
export const MEU_MUNDO: CaseStudy = {
  slug: 'meu-mundo',
  name: 'Meu Mundo 3D',
  kind: 'Jogo 3D multiplayer no navegador',
  division: 'games',
  accent: '#FF6A0A',
  seo: {
    title: 'Como fazemos o Meu Mundo, jogo 3D no navegador | TENKA',
    description:
      'Bastidores do Meu Mundo: mundo aberto 3D multiplayer no navegador, Domínios com chefões, minijogos, criação de personagem e modelos feitos por script no Blender.',
  },
  hero: {
    tagline: 'Um mundo para viver, dentro de uma comunidade.',
    lead:
      'O Meu Mundo é o jogo da comunidade games da Freelandoo: um mundo aberto 3D que roda no navegador do celular, com Domínios guardados por chefões, minijogos de corrida, luta e gincana, e personagens que ganham nível, ficha e equipamento. Está em testes fechados — só abre ao público quando estiver muito bem testado.',
    image: { src: `${MM}/mm-golem-vulcao.webp`, alt: 'O Golem no Vulcão de Kragor, um dos Domínios do Meu Mundo' },
  },
  stats: [
    { value: '6', label: 'Domínios em mundo aberto' },
    { value: '6', label: 'fases no minijogo Jetpack' },
    { value: '26', label: 'robôs por palco nos testes de carga' },
    { value: '0', label: 'modelos editados à mão' },
  ],
  planning: {
    lead:
      'Jogo no navegador do celular não perdoa: cada cena tem orçamento de triângulos e de chamadas de desenho, e nada entra sem um par de fotos provando que ficou igual ou mais bonito.',
    inputs: [
      'A lore: capítulos, deuses e os seis Domínios',
      'Personagens gerados no Tripo e riggados por script',
      'Referências de cenário e de cada minijogo',
      'Robôs de teste rodando como jogadores de verdade',
    ],
    decisions: [
      {
        title: 'Modelo só sai de script',
        body: 'Blender em segundo plano gera cada GLB; ninguém edita arquivo à mão. Mudou a peça, roda o script de novo.',
      },
      {
        title: 'Compressão que a segurança aceita',
        body: 'Malha com meshopt e textura em KTX2 UASTC — o formato que funciona sem afrouxar a política de segurança da página.',
      },
      {
        title: 'Medir com carga real',
        body: 'Desempenho só vale medido com 26 robôs em cada palco, depois de aquecer.',
      },
      {
        title: 'Cenário em código',
        body: 'Ambientes inteiros feitos a partir de imagens de referência, com cor e desgaste por vértice e uma chamada de desenho por bloco.',
      },
    ],
  },
  steps: [
    { date: '2026-11-09', title: 'Auditoria visual e de desempenho', body: 'Bairro de 198 mil para 51 mil triângulos no nível baixo, com props em blocos e casas instanciadas.' },
    { date: '2026-11-09', title: 'Jetpack com kit novo', body: 'As seis fases refeitas; o galão brilha e acende o jogador ao ser coletado.' },
    { date: '2026-11-11', title: 'Domínios refeitos', body: 'Mundo aberto com cenas e castelos, e o servidor dos seis Domínios pela lore.' },
    { date: '2026-11-11', title: 'Capítulos da Temporada 1', body: 'A história fechada do capítulo 1 ao 10.' },
  ],
  chapters: [
    {
      eyebrow: 'Mundo',
      title: 'Seis Domínios, cada um com o seu chefão',
      paragraphs: [
        'Floresta, gelo, cânion, fábrica, órbita e vulcão: cada Domínio tem setores, bandos e um castelo com o deus no fim. Os cenários foram construídos em código a partir de imagens de referência, com a luz do jogo aplicada na foto de prova.',
      ],
      images: [
        { src: `${MM}/mm-dominio-gelo.webp`, alt: 'Domínio do gelo', caption: 'Gelo' },
        { src: `${MM}/mm-dominio-floresta.webp`, alt: 'Domínio da floresta', caption: 'Floresta' },
        { src: `${MM}/mm-golem-vulcao.webp`, alt: 'Golem no vulcão', caption: 'Vulcão' },
      ],
    },
    {
      eyebrow: 'Minijogos',
      title: 'Jetpack, Rolê Noturno e Gincana',
      paragraphs: [
        'Os minijogos rodam na mesma engine, com kits de tema reaproveitáveis: as fases do Jetpack viraram floresta, ártico e outras sem refazer a mecânica.',
      ],
      images: [
        { src: `${MM}/mm-jetpack-floresta.webp`, alt: 'Jetpack na floresta', caption: 'Jetpack · floresta' },
        { src: `${MM}/mm-jetpack-artico.webp`, alt: 'Jetpack no ártico', caption: 'Jetpack · ártico' },
        { src: `${MM}/mm-menu-role.webp`, alt: 'Menu do Rolê Noturno', caption: 'Rolê Noturno' },
      ],
    },
    {
      eyebrow: 'Personagem',
      title: 'Ficha, equipamento e poder máximo',
      paragraphs: [
        'Cada personagem tem cartão, ficha de status e equipamentos, e sobe de nível jogando. Os golpes de poder máximo têm câmera e efeito próprios, com orçamento por nível de aparelho.',
      ],
      images: [
        { src: `${MM}/mm-ficha.webp`, alt: 'Ficha de status do personagem', caption: 'Ficha' },
        { src: `${MM}/mm-equipamentos.webp`, alt: 'Tela de equipamentos', caption: 'Equipamentos' },
        { src: `${MM}/mm-poder.webp`, alt: 'Golpes de poder máximo', caption: 'Poder máximo' },
      ],
    },
  ],
  stack: [
    { name: 'Babylon.js', why: 'a engine 3D no navegador' },
    { name: 'Colyseus', why: 'salas multiplayer em servidor próprio' },
    { name: 'Blender 5 (Python)', why: 'modelos, rigs e animações por script' },
    { name: 'Tripo', why: 'personagens e peças orgânicas' },
    { name: 'gltfpack + KTX2', why: 'malha e textura leves para o celular' },
    { name: 'Robôs de teste', why: 'carga real em cada palco' },
  ],
  cta: { label: 'Quero um jogo assim', to: '/games/jogos-mobile' },
};

/** EVO Brazil (Cat demon). Fonte: pasta `Cat demon` (prompts mestres, BIBLIOTECAS.md, pipeline, prints). */
export const EVO_BRAZIL: CaseStudy = {
  slug: 'evo-brazil',
  name: 'EVO Brazil',
  kind: 'Criação, treino e luta de criaturas em Godot',
  division: 'games',
  accent: '#FF6A0A',
  seo: {
    title: 'Como fazemos o EVO Brazil, jogo de criaturas | TENKA',
    description:
      'Bastidores do EVO Brazil: criaturas modeladas com IA, rig montado por medida e golpes animados por código no Godot, com arena, torneios e versão para Android.',
  },
  hero: {
    tagline: 'Criar, treinar, evoluir, lutar.',
    lead:
      'O EVO Brazil é um jogo de criação de criaturas: você cria, alimenta, treina e leva para torneios numa arena. Feito em Godot, com as criaturas geradas por IA e todo o resto — esqueleto, golpes e câmeras — construído em código.',
    image: { src: `${PG}/evo/selecao.webp`, alt: 'Tela de seleção do EVO Brazil' },
  },
  stats: [
    { value: '4', label: 'criaturas quadrúpedes' },
    { value: '0', label: 'golpes animados à mão' },
    { value: '2', label: 'plataformas: web e Android' },
    { value: '1', label: 'arena multiplayer em plano' },
  ],
  planning: {
    lead:
      'O jogo tem universo e identidade próprios. O plano mestre separa os sistemas — criação, alimentação, descanso, torneios, câmeras, longevidade — e cada um entra com código real, não com tela de mentira.',
    inputs: ['Personagens em retrato e folha de modelo', 'Modelos 3D gerados no Tripo', 'Regras da partida e balanceamento', 'Referências de arena e de cenário'],
    decisions: [
      { title: 'Rig por medida', body: 'O esqueleto é montado por script a partir das medidas de cada modelo; os personagens humanos encaixam 1 para 1 no perfil humanoide do Godot.' },
      { title: 'Golpe é número', body: 'Os golpes são gerados por código e medidos; o jogo lê esses números para o combate.' },
      { title: 'Biblioteca externa só onde serve', body: 'Animação pronta só para o que não é golpe (reação, queda, levantar), e baixada e versionada — nada depende de site no ar.' },
      { title: 'Godot Web e Android', body: 'O mesmo projeto exporta para o navegador e para o celular.' },
    ],
  },
  steps: [
    { date: '2026-08-21', title: 'Levantamento de bibliotecas', body: 'O que dá e o que não dá para usar de animação pronta no rig próprio.' },
  ],
  chapters: [
    {
      eyebrow: 'Personagens',
      title: 'Do retrato à folha de modelo',
      paragraphs: ['Cada criatura passa por retrato, folha de modelo de frente e de lado, modelo 3D e rig — antes de ganhar um único golpe.'],
      images: [
        { src: `${PG}/lab/retrato-catdemon.webp`, alt: 'Retrato do Cat demon', caption: 'Retrato' },
        { src: `${PG}/lab/sheet-full.webp`, alt: 'Folha de modelo completa', caption: 'Folha de modelo' },
        { src: `${PG}/lab/retrato-raposa-fogo.webp`, alt: 'Retrato da raposa de fogo', caption: 'Raposa de fogo' },
      ],
    },
    {
      eyebrow: 'Arena',
      title: 'Onde os torneios acontecem',
      paragraphs: ['A arena tem portões, arquibancada e um kit de cenário reaproveitável, com câmeras de apresentação para cada competidor.'],
      images: [
        { src: `${PG}/evo/arena-geral.webp`, alt: 'Vista geral da arena', caption: 'Arena' },
        { src: `${PG}/evo/arena-portao.webp`, alt: 'Portão da arena', caption: 'Portão' },
        { src: `${PG}/evo/kit-cenario.webp`, alt: 'Kit de cenário', caption: 'Kit de cenário' },
      ],
    },
  ],
  stack: [
    { name: 'Godot 4 + GDScript', why: 'o jogo, a arena e os sistemas' },
    { name: 'Tripo', why: 'as criaturas em 3D' },
    { name: 'Blender (Python)', why: 'rig por medida e animação por código' },
    { name: 'Godot Web + Android', why: 'um projeto, duas plataformas' },
  ],
  cta: { label: 'Quero um jogo assim', to: '/games/jogos-mobile' },
};

/** Astronaut Jetpack (Innovation Week). Fonte: repo `astronalta` (commits de 14/10/2026), `frontend/src/game`. */
export const ASTRONAUT: CaseStudy = {
  slug: 'astronaut-jetpack',
  name: 'Astronaut Jetpack',
  kind: 'Advergame de evento, jogável no celular',
  division: 'games',
  accent: '#FF1A1A',
  live: { url: 'https://www.tenkagroup.com.br/innovation-week/jogo', label: 'jogar agora' },
  seo: {
    title: 'Como fizemos o Astronaut Jetpack, advergame | TENKA',
    description:
      'Bastidores do Astronaut Jetpack, o jogo da Innovation Week: Three.js em tela vertical, simulação separada da renderização, poder do produto e ranking ao vivo.',
  },
  hero: {
    tagline: 'Abra a embalagem, entre no jogo.',
    lead:
      'O QR da embalagem da Innovation Week leva a uma experiência — e dentro dela, a um jogo. O astronauta voa por um túnel industrial, coleta o pote do produto para ganhar poder e disputa o ranking ao vivo do evento.',
    image: { src: `${PG}/jetpack.webp`, alt: 'O astronauta voando no jogo Astronaut Jetpack' },
  },
  stats: [
    { value: '9:16', label: 'tela vertical, feita para o celular' },
    { value: '5 s', label: 'de poder voando 2x mais rápido' },
    { value: '1', label: 'ranking ao vivo do evento' },
    { value: '1', label: 'dia do primeiro commit ao jogo no ar' },
  ],
  planning: {
    lead: 'Advergame bom é aquele em que o produto é a mecânica: o pote do produto é o poder do jogo.',
    inputs: ['A embalagem e o rótulo da Innovation Week', 'O astronauta do rótulo em 3D', 'O evento e o ranking ao vivo'],
    decisions: [
      { title: 'Vertical e no celular', body: 'O jogo abre do QR, no telefone, em tela 9:16.' },
      { title: 'O produto é o poder', body: 'Pegar o pote dá alguns segundos voando mais rápido e quebrando pilastras.' },
      { title: 'Simulação separada', body: 'Mundo, combustível, dificuldade e gerador de obstáculos ficam longe da renderização, com um sorteador próprio.' },
    ],
  },
  steps: [
    { date: '2026-10-14', title: 'O jogo em /jogo', body: 'Three.js em tela vertical.' },
    { date: '2026-10-14', title: 'O pote vira poder', body: 'Quebra pilastras e depois passa a dar velocidade dobrada.' },
    { date: '2026-10-14', title: 'Ranking ao vivo', body: 'Placar do evento e o jogo mais brilhante.' },
  ],
  chapters: [
    {
      eyebrow: 'Campanha',
      title: 'Da embalagem ao jogo',
      paragraphs: ['O mesmo astronauta do rótulo em 3D é o personagem do jogo — a campanha inteira conta uma história só.'],
      images: [
        { src: '/portfolio/works/studios/innovation.webp', alt: 'Rótulo 3D da Innovation Week', caption: 'O rótulo' },
        { src: `${PG}/arcade-astronaut.webp`, alt: 'O jogo num fliperama', caption: 'No fliperama' },
      ],
    },
  ],
  stack: [
    { name: 'Three.js', why: 'o túnel, o astronauta e as partículas' },
    { name: 'TypeScript + Vite', why: 'jogo leve que abre do QR' },
    { name: 'Hono + Postgres', why: 'ranking e eventos do jogo' },
  ],
  cta: { label: 'Quero um advergame', to: '/games/advergame-e-gamificacao' },
};
