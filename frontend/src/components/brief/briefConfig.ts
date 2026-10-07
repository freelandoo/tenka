/**
 * Configuração do briefing por divisão.
 *
 * O modal da Tenka Games já existia e funcionava bem; Studios e Tech só tinham
 * um link para /contato. Em vez de três cópias do mesmo componente de 420
 * linhas, existe um modal genérico e três configurações — as perguntas mudam,
 * o fluxo e a acessibilidade não.
 *
 * As perguntas de cada divisão qualificam o lead daquele negócio: a Games
 * precisa saber plataforma e estágio; a Studios precisa saber o que vai ser
 * produzido e para onde a peça vai; a Tech precisa saber o que já existe hoje e
 * com o que o sistema tem de conversar.
 */

export type BriefStepKind = 'single' | 'multi' | 'text' | 'contact';

export interface BriefStep {
  id: string;
  /** Título do passo, mostrado no cabeçalho do modal. */
  title: string;
  kind: BriefStepKind;
  /** Rótulo acima do campo, nos passos de texto. */
  label?: string;
  placeholder?: string;
  options?: string[];
  /** Grade de duas colunas quando as opções são curtas. */
  twoColumns?: boolean;
  /** Mensagem exibida quando o passo não foi preenchido. */
  requiredMessage?: string;
  /** Mínimo de caracteres nos passos de texto. */
  minLength?: number;
}

export interface BriefTheme {
  bg: string;
  bgElev: string;
  accent: string;
  accentSoft: string;
  text: string;
  dim: string;
  ok: string;
  /** Classe de fonte monoespaçada da própria divisão. */
  monoClass: string;
  /** Classe de display da própria divisão. */
  displayClass: string;
}

export interface BriefConfig {
  id: 'games' | 'studios' | 'tech';
  /** Linha fina acima do título. */
  eyebrow: string;
  /** Assunto do e-mail e abertura da mensagem de WhatsApp. */
  subject: string;
  theme: BriefTheme;
  steps: BriefStep[];
}

/** Último passo, igual nas três divisões. */
const CONTACT_STEP: BriefStep = {
  id: 'contato',
  title: 'Contato',
  kind: 'contact',
};

export const GAMES_BRIEF: BriefConfig = {
  id: 'games',
  eyebrow: 'NOVO PROJETO // BRIEFING',
  subject: 'Briefing — TENKA Games',
  theme: {
    bg: 'var(--wf-bg, #0d0d0d)',
    bgElev: 'var(--wf-bg-elev, #121212)',
    accent: 'var(--wf-energy, #ff640a)',
    accentSoft: 'var(--wf-energy-2, #ff9a35)',
    text: 'var(--wf-text, #f2f0eb)',
    dim: 'var(--wf-text-dim, #9b9892)',
    ok: 'var(--wf-ok, #b8d6b5)',
    monoClass: 'wf-mono',
    displayClass: 'wf-display',
  },
  steps: [
    {
      id: 'tipo',
      title: 'Tipo de projeto',
      kind: 'single',
      twoColumns: true,
      requiredMessage: 'Selecione um tipo de projeto para continuar.',
      options: [
        'Jogo de navegador',
        'Jogo mobile',
        'Jogo em VR',
        'Ativação de marca em VR',
        'Treinamento em VR',
        'Advergame ou gamificação',
        'Ainda estou definindo',
      ],
    },
    {
      id: 'estagio',
      title: 'Estágio atual',
      kind: 'single',
      requiredMessage: 'Informe em que estágio o projeto está.',
      options: ['Só uma ideia', 'Conceito definido', 'Protótipo existente', 'Em produção'],
    },
    {
      id: 'plataformas',
      title: 'Plataformas',
      kind: 'multi',
      twoColumns: true,
      requiredMessage: 'Selecione pelo menos uma plataforma.',
      options: ['Web / navegador', 'Android', 'iOS', 'Meta Quest', 'PC VR', 'PC / console'],
    },
    {
      id: 'escopo',
      title: 'Escopo',
      kind: 'text',
      minLength: 10,
      label: 'Descreva o que você quer construir — mecânica, referência, objetivo.',
      placeholder: 'Ex.: um simulador em VR para treinar a equipe de manutenção…',
      requiredMessage: 'Descreva o escopo em pelo menos uma frase (mínimo de 10 caracteres).',
    },
    CONTACT_STEP,
  ],
};

export const STUDIOS_BRIEF: BriefConfig = {
  id: 'studios',
  eyebrow: 'NOVA PRODUÇÃO // BRIEFING',
  subject: 'Briefing — TENKA Studios',
  theme: {
    bg: 'var(--ts-bg, #0b0b0d)',
    bgElev: 'var(--ts-surface, #111113)',
    accent: 'var(--ts-red, #d9232e)',
    accentSoft: '#ff6b73',
    text: 'var(--ts-text, #f2f0ec)',
    dim: 'var(--ts-muted, #9e9a98)',
    ok: '#b5d6bd',
    monoClass: 'ts-mono',
    displayClass: 'ts-display',
  },
  steps: [
    {
      id: 'tipo',
      title: 'O que vamos produzir',
      kind: 'single',
      twoColumns: true,
      requiredMessage: 'Selecione o que precisa ser produzido.',
      options: [
        'Maquete eletrônica 3D',
        'Animação 3D',
        'Mockup 3D de produto',
        'Identidade visual',
        'Branding completo',
        'Só o logotipo',
        'Ainda estou definindo',
      ],
    },
    {
      id: 'material',
      title: 'O que já existe',
      kind: 'single',
      requiredMessage: 'Informe o que já existe hoje.',
      options: [
        'Nada ainda — começamos do zero',
        'Projeto ou desenho técnico pronto',
        'Fotos e referências',
        'Marca existente a ser reformulada',
      ],
    },
    {
      id: 'destino',
      title: 'Onde a peça vai aparecer',
      kind: 'multi',
      twoColumns: true,
      requiredMessage: 'Selecione pelo menos um destino.',
      options: [
        'Stand e material de venda',
        'Redes sociais',
        'Anúncio e campanha',
        'E-commerce e marketplace',
        'Site',
        'Impresso e sinalização',
      ],
    },
    {
      id: 'escopo',
      title: 'Escopo',
      kind: 'text',
      minLength: 10,
      label: 'Conte o que precisa ser mostrado, e se há prazo de campanha ou lançamento.',
      placeholder: 'Ex.: fachada e áreas comuns de um lançamento, com stand abrindo em março…',
      requiredMessage: 'Descreva o escopo em pelo menos uma frase (mínimo de 10 caracteres).',
    },
    CONTACT_STEP,
  ],
};

export const TECH_BRIEF: BriefConfig = {
  id: 'tech',
  eyebrow: 'NOVO BUILD // BRIEFING',
  subject: 'Briefing — TENKA Tech',
  theme: {
    bg: 'var(--tt-bg, #080b0d)',
    bgElev: 'var(--tt-surface, #0d1215)',
    accent: 'var(--tt-cyan, #00b8b3)',
    accentSoft: '#70e2d8',
    text: 'var(--tt-text, #f2f1ed)',
    dim: 'var(--tt-muted, #899497)',
    ok: '#9ad6c2',
    monoClass: 'tt-mono',
    displayClass: 'tt-display',
  },
  steps: [
    {
      id: 'tipo',
      title: 'O que precisa entrar em operação',
      kind: 'single',
      twoColumns: true,
      requiredMessage: 'Selecione o que precisa ser construído.',
      options: [
        'Site institucional',
        'Landing page',
        'Sistema sob medida',
        'Plataforma SaaS',
        'Aplicativo',
        'Automação ou agente de IA',
        'Ainda estou definindo',
      ],
    },
    {
      id: 'situacao',
      title: 'Situação hoje',
      kind: 'single',
      requiredMessage: 'Informe a situação atual.',
      options: [
        'Não existe nada — vamos começar do zero',
        'Existe, mas está ultrapassado',
        'Existe e precisa evoluir',
        'Hoje é resolvido em planilha ou no manual',
      ],
    },
    {
      id: 'integracoes',
      title: 'O que precisa conversar',
      kind: 'multi',
      twoColumns: true,
      requiredMessage: 'Selecione pelo menos um item.',
      options: [
        'Login e permissões',
        'Pagamentos ou assinaturas',
        'WhatsApp e atendimento',
        'ERP ou CRM existente',
        'Relatórios e dashboards',
        'Nada por enquanto',
      ],
    },
    {
      id: 'escopo',
      title: 'Escopo',
      kind: 'text',
      minLength: 10,
      label: 'Descreva o problema que precisa ser resolvido e quem vai usar.',
      placeholder: 'Ex.: controlamos os pedidos em planilha e a equipe comercial perde follow-up…',
      requiredMessage: 'Descreva o escopo em pelo menos uma frase (mínimo de 10 caracteres).',
    },
    CONTACT_STEP,
  ],
};

export const BRIEF_CONFIGS = {
  games: GAMES_BRIEF,
  studios: STUDIOS_BRIEF,
  tech: TECH_BRIEF,
} as const;
