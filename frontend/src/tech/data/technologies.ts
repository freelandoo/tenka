export type TechGlyph = 'square' | 'diamond' | 'triangle' | 'circle' | 'hex' | 'cross';

export interface TechItem {
  id: string;
  name: string;
  glyph: TechGlyph;
  /** Função: what the technology does in the system. */
  role: string;
  /** Aplicação: where it shows up in real products. */
  application: string;
  /** Related product modules (connects the explorer to the builder). */
  modules: string[];
}

export interface TechCategory {
  id: string;
  name: string;
  items: TechItem[];
}

export const TECH_STACK: TechCategory[] = [
  {
    id: 'frontend',
    name: 'Front-end',
    items: [
      { id: 'react', name: 'React', glyph: 'hex', role: 'Construção de interfaces reativas e componentizadas.', application: 'Sites, painéis, sistemas e produtos interativos.', modules: ['Dashboard', 'Área administrativa'] },
      { id: 'nextjs', name: 'Next.js', glyph: 'square', role: 'Renderização híbrida, rotas e desempenho para a web.', application: 'Sites institucionais, portais e plataformas indexáveis.', modules: ['SEO', 'Websites'] },
      { id: 'typescript', name: 'TypeScript', glyph: 'circle', role: 'Tipagem estática para bases de código que crescem com segurança.', application: 'Toda a camada de aplicação dos produtos Tenka.', modules: ['Confiabilidade'] },
      { id: 'tailwind', name: 'Tailwind CSS', glyph: 'diamond', role: 'Sistema de estilos utilitário e consistente.', application: 'Design systems, temas e interfaces responsivas.', modules: ['UI e UX'] },
      { id: 'threejs', name: 'Three.js', glyph: 'triangle', role: 'Gráficos 3D em tempo real no navegador.', application: 'Experiências interativas, visualizadores e apresentações.', modules: ['Experiências'] },
    ],
  },
  {
    id: 'backend',
    name: 'Back-end',
    items: [
      { id: 'nodejs', name: 'Node.js', glyph: 'hex', role: 'Execução de serviços, regras de negócio e APIs.', application: 'APIs, processamento e serviços de aplicação.', modules: ['API', 'Automação'] },
      { id: 'rest', name: 'APIs REST', glyph: 'circle', role: 'Comunicação padronizada entre interfaces e serviços.', application: 'Integrações internas, apps móveis e parceiros externos.', modules: ['Integrações'] },
      { id: 'websockets', name: 'WebSockets', glyph: 'cross', role: 'Comunicação bidirecional em tempo real.', application: 'Chats, alertas, colaboração simultânea, painéis ao vivo e eventos instantâneos.', modules: ['Chat', 'Notificações'] },
      { id: 'jobs', name: 'Background jobs', glyph: 'square', role: 'Processamento assíncrono fora do fluxo do usuário.', application: 'Relatórios, cobranças, e-mails e rotinas agendadas.', modules: ['Automação de processos'] },
    ],
  },
  {
    id: 'mobile',
    name: 'Mobile',
    items: [
      { id: 'react-native', name: 'React Native', glyph: 'hex', role: 'Aplicativos nativos a partir de uma única base de código.', application: 'Apps Android e iOS com experiência nativa.', modules: ['Aplicativos'] },
      { id: 'flutter', name: 'Flutter', glyph: 'diamond', role: 'Interfaces móveis de alto desempenho multiplataforma.', application: 'Apps com identidade visual forte e animações fluidas.', modules: ['Aplicativos'] },
      { id: 'pwa', name: 'Progressive Web Apps', glyph: 'circle', role: 'Experiências instaláveis direto do navegador.', application: 'Produtos que precisam alcançar usuários sem loja de apps.', modules: ['Websites', 'Aplicativos'] },
    ],
  },
  {
    id: 'data',
    name: 'Dados',
    items: [
      { id: 'postgresql', name: 'PostgreSQL', glyph: 'square', role: 'Armazenamento estruturado de informações e relacionamentos críticos.', application: 'Usuários, pagamentos, histórico, permissões, produtos e operações.', modules: ['Login e usuários', 'Pagamentos'] },
      { id: 'redis', name: 'Redis', glyph: 'triangle', role: 'Memória de acesso instantâneo para dados quentes.', application: 'Sessões, filas, cache e ranking em tempo real.', modules: ['Desempenho'] },
      { id: 'analytics', name: 'Analytics', glyph: 'circle', role: 'Medição de comportamento e desempenho do produto.', application: 'Funis, retenção, conversão e decisões de evolução.', modules: ['Relatórios'] },
      { id: 'pipelines', name: 'Data pipelines', glyph: 'cross', role: 'Movimentação e transformação contínua de dados.', application: 'Consolidação de fontes, indicadores e integrações analíticas.', modules: ['Dashboard'] },
    ],
  },
  {
    id: 'infra',
    name: 'Infraestrutura',
    items: [
      { id: 'docker', name: 'Docker', glyph: 'square', role: 'Ambientes idênticos do desenvolvimento à produção.', application: 'Publicação previsível e escalável de serviços.', modules: ['Deploy'] },
      { id: 'vercel', name: 'Vercel', glyph: 'triangle', role: 'Publicação contínua com rede global.', application: 'Sites e aplicações web com deploy a cada versão.', modules: ['Websites'] },
      { id: 'cloud', name: 'Serviços em nuvem', glyph: 'hex', role: 'Computação, armazenamento e rede sob demanda.', application: 'Back-ends, bancos gerenciados e escalabilidade automática.', modules: ['Infraestrutura'] },
      { id: 'storage', name: 'Object storage', glyph: 'circle', role: 'Armazenamento de arquivos em escala.', application: 'Uploads, mídia, documentos e backups.', modules: ['Upload de arquivos'] },
      { id: 'monitoring', name: 'Monitoramento', glyph: 'cross', role: 'Observação contínua de erros e desempenho.', application: 'Alertas, logs e métricas de saúde do sistema.', modules: ['Operação'] },
    ],
  },
  {
    id: 'ai',
    name: 'Inteligência Artificial',
    items: [
      { id: 'llm', name: 'Modelos de linguagem', glyph: 'diamond', role: 'Compreensão e geração de texto em contexto.', application: 'Assistentes, resumos, classificação e atendimento.', modules: ['Inteligência artificial'] },
      { id: 'recsys', name: 'Sistemas de recomendação', glyph: 'hex', role: 'Sugestões relevantes a partir do comportamento.', application: 'Conteúdo, produtos e próximos passos do usuário.', modules: ['Personalização'] },
      { id: 'agents', name: 'Agentes de automação', glyph: 'cross', role: 'Execução autônoma de tarefas em múltiplos sistemas.', application: 'Rotinas operacionais, triagem e follow-ups.', modules: ['Automação de processos'] },
      { id: 'docs', name: 'Processamento de documentos', glyph: 'square', role: 'Extração estruturada de informação de arquivos.', application: 'Contratos, notas, formulários e cadastros.', modules: ['Upload de arquivos'] },
      { id: 'genui', name: 'Interfaces generativas', glyph: 'triangle', role: 'Telas que se adaptam ao contexto e à tarefa.', application: 'Painéis dinâmicos e experiências assistidas.', modules: ['Dashboard'] },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    items: [
      { id: 'figma', name: 'Figma', glyph: 'square', role: 'Design de interface e colaboração em tempo real.', application: 'Wireframes, protótipos navegáveis e handoff.', modules: ['UI e UX'] },
      { id: 'design-systems', name: 'Design systems', glyph: 'hex', role: 'Biblioteca viva de componentes e regras visuais.', application: 'Consistência entre telas, times e plataformas.', modules: ['UI e UX'] },
      { id: 'prototyping', name: 'Prototipagem', glyph: 'triangle', role: 'Validação de fluxos antes do desenvolvimento.', application: 'Testes com usuários e decisões de produto.', modules: ['Protótipo'] },
      { id: 'usability', name: 'Testes de usabilidade', glyph: 'circle', role: 'Observação de uso real das interfaces.', application: 'Ajustes de fluxo, hierarquia e clareza.', modules: ['UX'] },
    ],
  },
  {
    id: 'integrations',
    name: 'Integrações',
    items: [
      { id: 'payments', name: 'Sistemas de pagamento', glyph: 'diamond', role: 'Cobrança, repasse e assinatura dentro do produto.', application: 'Checkout, recorrência, split e conciliação.', modules: ['Pagamentos', 'Assinaturas'] },
      { id: 'comms', name: 'APIs de comunicação', glyph: 'circle', role: 'Mensagens por e-mail, SMS, push e WhatsApp.', application: 'Notificações, confirmações e campanhas.', modules: ['Notificações'] },
      { id: 'auth', name: 'Provedores de autenticação', glyph: 'square', role: 'Identidade, sessão e login social seguros.', application: 'Acesso por Google, Apple e single sign-on.', modules: ['Login e usuários'] },
      { id: 'webhooks', name: 'Webhooks', glyph: 'cross', role: 'Eventos entre sistemas no momento em que acontecem.', application: 'Sincronização com ERPs, CRMs e plataformas externas.', modules: ['Integrações'] },
      { id: 'external', name: 'Plataformas externas', glyph: 'hex', role: 'Conexão com serviços que o negócio já utiliza.', application: 'ERPs, logística, mapas, agendas e marketplaces.', modules: ['Integrações'] },
    ],
  },
];
