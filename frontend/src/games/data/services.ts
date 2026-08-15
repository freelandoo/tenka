export interface GameService {
  id: string;
  index: string;
  title: string;
  label: string;
  description: string;
  deliverables: string[];
  featured?: boolean;
}

export const GAME_SERVICES: GameService[] = [
  {
    id: 'browser',
    index: '01',
    title: 'Jogos de navegador',
    label: 'WEB / WEBGL',
    description:
      'Experiências acessíveis por link, sem instalação, prontas para campanhas, plataformas e produtos digitais.',
    deliverables: ['WebGL', 'Responsivo', 'Integrações'],
  },
  {
    id: 'mobile',
    index: '02',
    title: 'Jogos mobile',
    label: 'IOS / ANDROID',
    description:
      'Jogos pensados para o gesto, o ritmo e a rotina do celular, da primeira mecânica até a publicação.',
    deliverables: ['Protótipo', 'Produção', 'Publicação'],
  },
  {
    id: 'vr-games',
    index: '03',
    title: 'Jogos em VR',
    label: 'REALIDADE VIRTUAL',
    description:
      'Mundos imersivos com presença, interação espacial e performance calibrada para cada dispositivo.',
    deliverables: ['Quest', 'PC VR', 'Interação espacial'],
    featured: true,
  },
  {
    id: 'vr-activation',
    index: '04',
    title: 'Ativações para empresas em VR',
    label: 'MARCA / EVENTO',
    description:
      'Experiências de marca memoráveis para eventos, lançamentos, feiras e espaços proprietários.',
    deliverables: ['Conceito', 'Instalação', 'Operação'],
  },
  {
    id: 'vr-training',
    index: '05',
    title: 'Treinamentos em VR',
    label: 'SIMULAÇÃO / APRENDIZADO',
    description:
      'Simulações seguras e mensuráveis para capacitar equipes em processos, ambientes e situações críticas.',
    deliverables: ['Cenários', 'Avaliação', 'Analytics'],
    featured: true,
  },
];

export const PRODUCTION_STEPS = [
  {
    index: '01',
    title: 'Imersão',
    description: 'Entendemos objetivo, público, ambiente e resultado esperado.',
  },
  {
    index: '02',
    title: 'Protótipo',
    description: 'Testamos a mecânica central cedo, antes de escalar a produção.',
  },
  {
    index: '03',
    title: 'Construção',
    description: 'Arte, código, áudio e interação avançam como um único sistema.',
  },
  {
    index: '04',
    title: 'Entrega',
    description: 'Validamos, publicamos e acompanhamos a experiência em campo.',
  },
];
