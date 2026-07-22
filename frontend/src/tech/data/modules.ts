/** Service modules — the "O que podemos construir" installable modules. */
export interface ServiceModule {
  id: string;
  code: string;
  title: string;
  description: string;
  requirements: string[];
}

export const SERVICE_MODULES: ServiceModule[] = [
  {
    id: 'websites',
    code: 'MOD-01',
    title: 'WEBSITES',
    description: 'Sites institucionais, landing pages, portais, e-commerces e experiências interativas.',
    requirements: ['DESIGN', 'FRONT-END', 'SEO'],
  },
  {
    id: 'aplicativos',
    code: 'MOD-02',
    title: 'APLICATIVOS',
    description: 'Aplicativos móveis, plataformas híbridas e experiências multiplataforma.',
    requirements: ['MOBILE', 'API', 'PUSH'],
  },
  {
    id: 'sistemas',
    code: 'MOD-03',
    title: 'SISTEMAS',
    description: 'CRMs, ERPs, plataformas SaaS, dashboards e ferramentas administrativas.',
    requirements: ['BACK-END', 'DADOS', 'PERMISSÕES'],
  },
  {
    id: 'automacoes',
    code: 'MOD-04',
    title: 'AUTOMAÇÕES',
    description: 'Integrações, notificações, inteligência artificial e fluxos operacionais.',
    requirements: ['WEBHOOKS', 'IA', 'FILAS'],
  },
  {
    id: 'ui-ux',
    code: 'MOD-05',
    title: 'UI E UX',
    description: 'Pesquisa, arquitetura de informação, prototipagem e design de interfaces.',
    requirements: ['PESQUISA', 'PROTÓTIPO', 'DESIGN SYSTEM'],
  },
  {
    id: 'infraestrutura',
    code: 'MOD-06',
    title: 'INFRAESTRUTURA',
    description: 'APIs, banco de dados, autenticação, publicação, segurança e escalabilidade.',
    requirements: ['CLOUD', 'CI/CD', 'MONITORAMENTO'],
  },
];

/** Product-builder modules — what the visitor assembles into a configuration. */
export interface BuilderModule {
  id: string;
  name: string;
  /** Weight used to compute the (non-binding) complexity reading. */
  weight: 1 | 2 | 3;
  /** Which preview panel the Build Canvas gains when this module is on. */
  panel: 'login' | 'payments' | 'dashboard' | 'admin' | 'ai' | 'schedule' | 'notify' | 'geo' | 'chat' | 'reports' | 'integrations' | 'subscriptions' | 'marketplace' | 'upload' | 'permissions' | 'automation';
}

export const BUILDER_MODULES: BuilderModule[] = [
  { id: 'login', name: 'Login e usuários', weight: 1, panel: 'login' },
  { id: 'pagamentos', name: 'Pagamentos', weight: 3, panel: 'payments' },
  { id: 'dashboard', name: 'Dashboard', weight: 2, panel: 'dashboard' },
  { id: 'admin', name: 'Área administrativa', weight: 2, panel: 'admin' },
  { id: 'ia', name: 'Inteligência artificial', weight: 3, panel: 'ai' },
  { id: 'agendamento', name: 'Agendamento', weight: 2, panel: 'schedule' },
  { id: 'notificacoes', name: 'Notificações', weight: 1, panel: 'notify' },
  { id: 'geolocalizacao', name: 'Geolocalização', weight: 2, panel: 'geo' },
  { id: 'chat', name: 'Chat', weight: 2, panel: 'chat' },
  { id: 'relatorios', name: 'Relatórios', weight: 1, panel: 'reports' },
  { id: 'integracoes', name: 'Integrações', weight: 2, panel: 'integrations' },
  { id: 'assinaturas', name: 'Assinaturas', weight: 2, panel: 'subscriptions' },
  { id: 'marketplace', name: 'Marketplace', weight: 3, panel: 'marketplace' },
  { id: 'upload', name: 'Upload de arquivos', weight: 1, panel: 'upload' },
  { id: 'permissoes', name: 'Permissões', weight: 1, panel: 'permissions' },
  { id: 'automacao', name: 'Automação de processos', weight: 2, panel: 'automation' },
];

export interface BuildSummary {
  moduleCount: number;
  integrationLevel: 'BAIXO' | 'MÉDIO' | 'ALTO';
  complexity: 'INICIAL' | 'INTERMEDIÁRIA' | 'AVANÇADA';
  recommendedPhase: 'DESCOBERTA' | 'PROTÓTIPO' | 'ARQUITETURA';
}

/** Visual discovery reading — explicitly NOT a price or commercial estimate. */
export function summarizeBuild(selected: string[]): BuildSummary {
  const weight = BUILDER_MODULES.filter((m) => selected.includes(m.id)).reduce(
    (total, m) => total + m.weight,
    0,
  );
  return {
    moduleCount: selected.length,
    integrationLevel: weight <= 4 ? 'BAIXO' : weight <= 12 ? 'MÉDIO' : 'ALTO',
    complexity: weight <= 4 ? 'INICIAL' : weight <= 12 ? 'INTERMEDIÁRIA' : 'AVANÇADA',
    recommendedPhase: weight <= 4 ? 'DESCOBERTA' : weight <= 12 ? 'PROTÓTIPO' : 'ARQUITETURA',
  };
}
