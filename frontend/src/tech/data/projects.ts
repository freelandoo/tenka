export type ProjectKind = 'site' | 'app' | 'dashboard' | 'crm' | 'analytics';

export interface TechnologyProject {
  id: string;
  title: string;
  category: string;
  description: string;
  challenge: string;
  solution: string;
  technologies: string[];
  platforms: string[];
  status: string;
  /** Which mock composition renders inside the product window. */
  kind: ProjectKind;
  /** Fake production URL shown in the window chrome. */
  url: string;
  accent: string;
  /** Initial desktop position of the floating window (percentages). */
  desk: { x: number; y: number; w: number };
}

export const TECH_PROJECTS: TechnologyProject[] = [
  {
    id: 'finland',
    title: 'FINLAND',
    category: 'Rede social e plataforma digital',
    description:
      'Plataforma social com perfis, conteúdo, comunidades, mensagens, ferramentas profissionais e experiências conectadas.',
    challenge:
      'Sustentar interações em tempo real entre milhares de usuários sem degradar a experiência.',
    solution:
      'Arquitetura orientada a eventos, WebSockets para presença e mensagens, e feed com carregamento incremental.',
    technologies: ['React', 'Node.js', 'PostgreSQL', 'WebSockets', 'Redis'],
    platforms: ['Web', 'Android', 'iOS'],
    status: 'EM OPERAÇÃO',
    kind: 'site',
    url: 'app.finland.social',
    accent: '#8CFFF1',
    desk: { x: 6, y: 8, w: 21 },
  },
  {
    id: 'gym-control',
    title: 'GYM CONTROL',
    category: 'Sistema de gestão e relacionamento',
    description:
      'CRM para academias com alunos, frequência, pagamentos, fichas de treino, indicadores e integrações operacionais.',
    challenge:
      'Unificar cadastro, cobrança recorrente e controle de acesso que viviam em três sistemas separados.',
    solution:
      'Plataforma única com catraca integrada por API, cobrança automática e painel de retenção de alunos.',
    technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'APIs REST'],
    platforms: ['Web', 'Painel administrativo'],
    status: 'EM OPERAÇÃO',
    kind: 'crm',
    url: 'painel.gymcontrol.com.br',
    accent: '#65FFB5',
    desk: { x: 34, y: 4, w: 30 },
  },
  {
    id: 'flow-crm',
    title: 'FLOW CRM',
    category: 'Captação e automação comercial',
    description:
      'Sistema para organizar campanhas, contatos, etapas de atendimento, coleta de dados e acompanhamento de oportunidades.',
    challenge:
      'Times comerciais perdiam oportunidades por falta de follow-up e dados espalhados em planilhas.',
    solution:
      'Funil visual com automações de contato, captura por formulários integrados e alertas de inatividade.',
    technologies: ['React', 'Node.js', 'Redis', 'Webhooks', 'Automações'],
    platforms: ['Web'],
    status: 'EM EVOLUÇÃO',
    kind: 'dashboard',
    url: 'flow.tenka.com.br',
    accent: '#1d6bff',
    desk: { x: 66, y: 12, w: 27 },
  },
  {
    id: 'book-now',
    title: 'BOOK NOW',
    category: 'Aplicativo de agendamento',
    description:
      'Experiência de agendamento, pagamento, notificações e gestão de serviços para profissionais autônomos.',
    challenge:
      'Reduzir faltas e simplificar o pagamento antecipado de horários para profissionais independentes.',
    solution:
      'Agenda em tempo real, checkout no próprio fluxo e lembretes automáticos por push e WhatsApp.',
    technologies: ['React Native', 'Node.js', 'PostgreSQL', 'Pagamentos', 'Push'],
    platforms: ['Android', 'iOS', 'Web'],
    status: 'EM OPERAÇÃO',
    kind: 'app',
    url: 'app.booknow.com.br',
    accent: '#FFBE55',
    desk: { x: 14, y: 46, w: 20 },
  },
  {
    id: 'data-view',
    title: 'DATA VIEW',
    category: 'Dashboard e inteligência operacional',
    description:
      'Painel de dados para acompanhar métricas, operações, alertas, desempenho e tomada de decisões.',
    challenge:
      'Transformar dados dispersos de várias fontes em decisões diárias rápidas para a operação.',
    solution:
      'Pipeline de dados consolidado, métricas ao vivo via WebSockets e alertas configuráveis por limite.',
    technologies: ['React', 'Three.js', 'Node.js', 'Data pipelines', 'WebSockets'],
    platforms: ['Web', 'Painel administrativo'],
    status: 'EM OPERAÇÃO',
    kind: 'analytics',
    url: 'dataview.tenka.com.br',
    accent: '#8BA3FF',
    desk: { x: 46, y: 44, w: 30 },
  },
];
