/** System architecture diagram content (rendered with React Flow). */

export interface ArchNodeData {
  label: string;
  detail: string;
  /** Group controls entry order: core first, then data, then external. */
  group: 'actor' | 'core' | 'data' | 'external';
  [key: string]: unknown;
}

export interface ArchNodeSpec {
  id: string;
  position: { x: number; y: number };
  data: ArchNodeData;
}

export const ARCH_NODES: ArchNodeSpec[] = [
  { id: 'user', position: { x: 0, y: 150 }, data: { label: 'USUÁRIO', group: 'actor', detail: 'Quem usa o produto: clientes, equipes e administradores, em qualquer dispositivo.' } },
  { id: 'web', position: { x: 220, y: 60 }, data: { label: 'APLICAÇÃO WEB', group: 'core', detail: 'Interface principal no navegador: páginas, painéis e fluxos de uso.' } },
  { id: 'mobile', position: { x: 220, y: 240 }, data: { label: 'APLICATIVO', group: 'core', detail: 'Experiência móvel com notificações, câmera, localização e uso diário.' } },
  { id: 'auth', position: { x: 460, y: 0 }, data: { label: 'AUTENTICAÇÃO', group: 'core', detail: 'Controle de acesso, níveis de permissão, recuperação de conta e proteção das áreas restritas.' } },
  { id: 'api', position: { x: 460, y: 150 }, data: { label: 'API', group: 'core', detail: 'Camada responsável pela comunicação entre interfaces, banco de dados e serviços externos.' } },
  { id: 'db', position: { x: 700, y: 60 }, data: { label: 'BANCO DE DADOS', group: 'data', detail: 'Armazenamento estruturado: usuários, operações, histórico e relacionamentos.' } },
  { id: 'payments', position: { x: 700, y: 220 }, data: { label: 'PAGAMENTOS', group: 'external', detail: 'Checkout, assinaturas, repasses e conciliação integrados ao produto.' } },
  { id: 'notify', position: { x: 460, y: 320 }, data: { label: 'NOTIFICAÇÕES', group: 'external', detail: 'E-mails, push e mensagens disparados por eventos do sistema.' } },
  { id: 'analytics', position: { x: 940, y: 0 }, data: { label: 'ANALYTICS', group: 'data', detail: 'Métricas de uso, funis e indicadores para decisões de evolução.' } },
  { id: 'admin', position: { x: 940, y: 150 }, data: { label: 'ADMINISTRAÇÃO', group: 'core', detail: 'Painel interno de gestão: conteúdo, usuários, operações e configurações.' } },
  { id: 'external', position: { x: 940, y: 300 }, data: { label: 'SERVIÇOS EXTERNOS', group: 'external', detail: 'ERPs, logística, agendas e plataformas que o negócio já usa, conectados por API.' } },
  { id: 'ai', position: { x: 700, y: 360 }, data: { label: 'INTELIGÊNCIA ARTIFICIAL', group: 'external', detail: 'Assistentes, automações e processamento inteligente acoplados aos fluxos.' } },
];

export interface ArchEdgeSpec {
  id: string;
  source: string;
  target: string;
}

export const ARCH_EDGES: ArchEdgeSpec[] = [
  { id: 'e-user-web', source: 'user', target: 'web' },
  { id: 'e-user-mobile', source: 'user', target: 'mobile' },
  { id: 'e-web-auth', source: 'web', target: 'auth' },
  { id: 'e-web-api', source: 'web', target: 'api' },
  { id: 'e-mobile-api', source: 'mobile', target: 'api' },
  { id: 'e-auth-api', source: 'auth', target: 'api' },
  { id: 'e-api-db', source: 'api', target: 'db' },
  { id: 'e-api-payments', source: 'api', target: 'payments' },
  { id: 'e-api-notify', source: 'api', target: 'notify' },
  { id: 'e-db-analytics', source: 'db', target: 'analytics' },
  { id: 'e-db-admin', source: 'db', target: 'admin' },
  { id: 'e-api-external', source: 'payments', target: 'external' },
  { id: 'e-api-ai', source: 'api', target: 'ai' },
];

/** Operational scenarios — "Systems in operation" section. */
export interface OperationScenario {
  id: string;
  name: string;
  steps: { actor: string; action: string }[];
}

export const OPERATION_SCENARIOS: OperationScenario[] = [
  {
    id: 'compra',
    name: 'COMPRA',
    steps: [
      { actor: 'CLIENTE', action: 'Confirma o pedido no aplicativo.' },
      { actor: 'APLICAÇÃO', action: 'Valida os dados e envia a requisição.' },
      { actor: 'API', action: 'Processa o pagamento com o provedor.' },
      { actor: 'BANCO DE DADOS', action: 'Registra a transação e atualiza o estoque.' },
      { actor: 'AUTOMAÇÃO', action: 'Dispara a confirmação por e-mail e push.' },
      { actor: 'DASHBOARD', action: 'Receita e pedidos atualizam em tempo real.' },
    ],
  },
  {
    id: 'agendamento',
    name: 'AGENDAMENTO',
    steps: [
      { actor: 'CLIENTE', action: 'Escolhe o horário disponível.' },
      { actor: 'API', action: 'Bloqueia o horário e evita conflito.' },
      { actor: 'BANCO DE DADOS', action: 'Grava o compromisso na agenda.' },
      { actor: 'AUTOMAÇÃO', action: 'Agenda lembretes para as duas partes.' },
      { actor: 'PROFISSIONAL', action: 'Recebe o novo horário no painel.' },
      { actor: 'ANALYTICS', action: 'Taxa de ocupação é recalculada.' },
    ],
  },
  {
    id: 'cadastro',
    name: 'CADASTRO',
    steps: [
      { actor: 'CLIENTE', action: 'Preenche o formulário de conta.' },
      { actor: 'APLICAÇÃO', action: 'Valida campos e aceita os termos.' },
      { actor: 'AUTENTICAÇÃO', action: 'Cria credenciais e nível de acesso.' },
      { actor: 'BANCO DE DADOS', action: 'Armazena o perfil com permissões.' },
      { actor: 'AUTOMAÇÃO', action: 'Envia boas-vindas e inicia onboarding.' },
      { actor: 'ADMINISTRADOR', action: 'Vê o novo usuário no painel.' },
    ],
  },
  {
    id: 'atendimento',
    name: 'ATENDIMENTO',
    steps: [
      { actor: 'CLIENTE', action: 'Abre uma conversa no chat.' },
      { actor: 'IA', action: 'Classifica o assunto e responde o básico.' },
      { actor: 'API', action: 'Encaminha casos complexos à equipe.' },
      { actor: 'ATENDENTE', action: 'Assume com o histórico completo.' },
      { actor: 'BANCO DE DADOS', action: 'Registra a resolução do caso.' },
      { actor: 'ANALYTICS', action: 'Tempo de resposta entra nas métricas.' },
    ],
  },
  {
    id: 'automacao',
    name: 'AUTOMAÇÃO',
    steps: [
      { actor: 'SISTEMA', action: 'Detecta assinatura próxima do vencimento.' },
      { actor: 'AUTOMAÇÃO', action: 'Executa a régua de renovação.' },
      { actor: 'API', action: 'Tenta a cobrança automática.' },
      { actor: 'PAGAMENTOS', action: 'Confirma a renovação da assinatura.' },
      { actor: 'NOTIFICAÇÕES', action: 'Informa o cliente do resultado.' },
      { actor: 'DASHBOARD', action: 'Churn e receita recorrente atualizam.' },
    ],
  },
];
