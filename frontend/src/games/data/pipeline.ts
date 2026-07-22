export interface PipelineStage {
  id: string;
  index: string;
  name: string;
  description: string;
  annotation: string;
  /** Expected deliverable at the end of this stage. */
  deliverable: string;
  /** The typical project decision made here. */
  decision: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'descoberta',
    index: '01',
    name: 'DESCOBERTA',
    description: 'Objetivos, público, referências, limitações e oportunidades do projeto.',
    annotation: 'BRIEFING // REFERÊNCIAS',
    deliverable: 'Documento de descoberta e escopo inicial.',
    decision: 'Vale a pena construir? Qual é a aposta central?',
  },
  {
    id: 'conceito',
    index: '02',
    name: 'CONCEITO',
    description: 'Definição do universo, mecânicas centrais e proposta de experiência.',
    annotation: 'PILARES // MOODBOARD',
    deliverable: 'Pilares de design e direção de arte inicial.',
    decision: 'Qual é a mecânica que sustenta tudo?',
  },
  {
    id: 'prototipo',
    index: '03',
    name: 'PROTÓTIPO',
    description: 'Construção da primeira versão jogável para validar as decisões principais.',
    annotation: 'GREYBOX // CORE LOOP',
    deliverable: 'Build jogável do core loop em greybox.',
    decision: 'Diverte sem arte final? Segue ou pivota?',
  },
  {
    id: 'producao',
    index: '04',
    name: 'PRODUÇÃO',
    description: 'Desenvolvimento dos sistemas, conteúdo, arte, interface e infraestrutura.',
    annotation: 'SPRINTS // BUILDS',
    deliverable: 'Vertical slice e builds incrementais verificáveis.',
    decision: 'O que entra na primeira versão e o que espera?',
  },
  {
    id: 'testes',
    index: '05',
    name: 'TESTES',
    description: 'Avaliação de desempenho, equilíbrio, usabilidade e comportamento dos jogadores.',
    annotation: 'PLAYTEST // TELEMETRIA',
    deliverable: 'Relatórios de playtest e ajustes de balanceamento.',
    decision: 'Onde os jogadores travam? O que precisa mudar?',
  },
  {
    id: 'lancamento',
    index: '06',
    name: 'LANÇAMENTO',
    description: 'Preparação técnica, publicação, comunicação e acompanhamento inicial.',
    annotation: 'DEPLOY // LOJAS',
    deliverable: 'Build de lançamento e material de loja.',
    decision: 'Está pronto para o primeiro player real?',
  },
  {
    id: 'evolucao',
    index: '07',
    name: 'EVOLUÇÃO',
    description: 'Novos conteúdos, ajustes, métricas e desenvolvimento contínuo.',
    annotation: 'UPDATES // LIVE OPS',
    deliverable: 'Roadmap de atualizações guiado por dados.',
    decision: 'O que mantém o mundo vivo depois do lançamento?',
  },
];
