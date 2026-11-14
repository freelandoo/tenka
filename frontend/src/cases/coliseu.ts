import type { CaseStudy } from './types';

const IMG = '/portfolio/cases/coliseu';

/** Sistema Coliseu (Academia Coliseu Team). Fonte: `Coliseu/coliseu-backend` (262 commits, 28/06 a 11/11/2026), README e `access-agent/`. */
export const COLISEU: CaseStudy = {
  slug: 'sistema-coliseu',
  name: 'Sistema Coliseu',
  kind: 'CRM de academia com catraca por reconhecimento facial',
  division: 'tech',
  accent: '#E0262F',
  live: { url: 'https://www.academiacoliseu.com.br', label: 'academiacoliseu.com.br' },
  seo: {
    title: 'Como fizemos o Sistema Coliseu, CRM de academia | TENKA',
    description:
      'Bastidores do Sistema Coliseu: CRM de academia em quatro estágios, cobrança recorrente idempotente e um agente que controla a catraca com reconhecimento facial.',
  },
  hero: {
    tagline: 'Disciplina. Pessoas. Resultados.',
    lead:
      'Uma academia que vivia entre planilha, sistema alugado e catraca que não conversava com nada. O Coliseu juntou tudo num sistema só: do lead que chega pelo WhatsApp à matrícula, à cobrança do mês e à porta que abre quando o rosto do aluno em dia aparece na câmera.',
    image: { src: `${IMG}/crm.webp`, alt: 'Tela de entrada do Coliseu CRM com o coliseu em 3D em linhas vermelhas' },
  },
  stats: [
    { value: '262', label: 'commits em produção' },
    { value: '4', label: 'estágios: captação → retenção' },
    { value: '55', label: 'tabelas no banco' },
    { value: '1', label: 'agente que fala com a catraca' },
  ],
  planning: {
    lead:
      'O sistema nasceu do fluxograma da própria operação da academia, desenhado em quatro estágios. Cada tela responde a uma pergunta do dia a dia da recepção — e só depois vieram integrações.',
    inputs: [
      'O fluxograma operacional da academia',
      'Os planos e alunos do sistema que ela usava antes',
      'A catraca de reconhecimento facial já instalada',
      'A rotina da recepção: aula experimental, liberação, cobrança',
    ],
    decisions: [
      {
        title: 'Quatro estágios, não um cadastro',
        body: 'Captação (leads por origem), matrícula (planos e contrato), cobrança (vencimento e inadimplência) e retenção (presença em faixas de 7, 14 e 21 dias).',
      },
      {
        title: 'Cobrança que não duplica',
        body: 'O processador de pagamentos é idempotente e respeita a ordem dos eventos: aviso repetido ou atrasado não muda o estado errado.',
      },
      {
        title: 'Um agente no PC da recepção',
        body: 'A catraca fica na rede local da academia. Um agente instalado na recepção conversa com o servidor e com o aparelho, e segue funcionando se a internet cair.',
      },
      {
        title: 'Migrar sem parar a academia',
        body: 'Planos e alunos vieram do sistema anterior, e por um período os dois liberaram a catraca até a data de corte.',
      },
    ],
  },
  steps: [
    { date: '2026-07-06', commit: '11c8653', title: 'Assinaturas recorrentes', body: 'Cobrança mensal com baixa e atraso registrados no sistema.' },
    { date: '2026-07-06', commit: 'f97649e', title: 'Processador idempotente', body: 'Pagamento, cobrança e matrícula atualizados com guarda de ordem.' },
    { date: '2026-07-06', commit: 'a2b01a8', title: 'Painel de acesso', body: 'Catracas, sincronização, comandos e cada entrada registrada.' },
    { date: '2026-07-07', commit: '4454814', title: 'Driver real do iDFace', body: 'O agente passa a falar com a catraca de reconhecimento facial, com proteção para ficar sem internet.' },
    { date: '2026-07-17', commit: '5c051a3', title: 'Migração dos planos', body: 'Os planos do sistema anterior cadastrados no Coliseu.' },
    { date: '2026-10-06', commit: '61ae179', title: 'Kit da recepção', body: 'A recepção libera a catraca pelo próprio sistema.' },
    { date: '2026-10-23', commit: 'd1a3b83', title: 'Corte do sistema antigo', body: 'Liberação pelos dois sistemas até a data de corte, com instalador para o PC da recepção.' },
    { date: '2026-10-26', commit: '2fd10d0', title: 'Aula experimental', body: 'CPF obrigatório, uma aula por pessoa, histórico e lembrete.' },
    { date: '2026-10-27', commit: '57c813c', title: 'Contratos a vencer', body: 'Aba com os contratos que vencem nos próximos 30 dias.' },
  ],
  chapters: [
    {
      eyebrow: 'Catraca',
      title: 'Software que abre uma porta de verdade',
      paragraphs: [
        'O agente faz um ciclo simples: avisa que está vivo, busca os comandos pendentes (liberar, bloquear, cadastrar rosto), executa no aparelho, confirma e devolve cada entrada registrada. O mesmo caminho serve para um aparelho simulado — é assim que tudo foi testado antes de chegar perto da catraca real.',
        'Cada entrada alimenta a presença do aluno, e a presença alimenta a retenção: quem sumiu há 7, 14 ou 21 dias aparece para a recepção chamar.',
      ],
    },
    {
      eyebrow: 'Interface',
      title: 'Coliseu industrial',
      paragraphs: [
        'Cinza escuro e vermelho fosco, tipografia condensada, animações em GSAP e o coliseu em linhas 3D na entrada. O sistema também instala como app e manda notificação para a equipe.',
      ],
      images: [{ src: `${IMG}/capa.webp`, alt: 'Entrada do sistema com o coliseu em 3D', caption: 'A entrada da equipe' }],
    },
  ],
  stack: [
    { name: 'Next.js 16 + React 19', why: 'sistema e API no mesmo projeto' },
    { name: 'Prisma + Postgres', why: '55 tabelas: alunos, planos, cobranças, acessos' },
    { name: 'Node (agente local)', why: 'a ponte entre o servidor e a catraca' },
    { name: 'Control iD iDFace', why: 'catraca de reconhecimento facial' },
    { name: 'Three.js + GSAP', why: 'o coliseu em 3D e o movimento da interface' },
    { name: 'Web Push', why: 'aviso para a equipe' },
    { name: 'Playwright + Vitest', why: 'fluxos testados de ponta a ponta' },
  ],
  cta: { label: 'Quero um sistema assim', to: '/tech/sistemas-sob-medida' },
};
