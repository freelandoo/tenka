/** Etapas do processo criativo — linha de produção audiovisual real. */
export interface ProcessStage {
  number: string;
  title: string;
  description: string;
  /** Linguagem visual da vinheta da etapa. */
  visual: 'notes' | 'moodboard' | 'storyboard' | 'artdirection' | 'shooting' | 'editing' | 'publishing' | 'reaction';
  label: string;
}

export const PROCESS_STAGES: ProcessStage[] = [
  {
    number: '01',
    title: 'IMERSÃO',
    description: 'Entendimento da marca, do público, do momento e da mensagem.',
    visual: 'notes',
    label: 'CADERNO DE CAMPO',
  },
  {
    number: '02',
    title: 'CONCEITO',
    description: 'Definição da ideia central que sustenta todas as peças.',
    visual: 'moodboard',
    label: 'MOODBOARD V2',
  },
  {
    number: '03',
    title: 'ROTEIRO',
    description: 'Organização da narrativa, das cenas, dos textos e do ritmo.',
    visual: 'storyboard',
    label: 'STORYBOARD // CENAS 1–12',
  },
  {
    number: '04',
    title: 'DIREÇÃO DE ARTE',
    description: 'Criação da linguagem visual, das referências, das cores e da composição.',
    visual: 'artdirection',
    label: 'PALETA APROVADA',
  },
  {
    number: '05',
    title: 'PRODUÇÃO',
    description: 'Captação de imagens, fotografia, gravação, cenografia e execução.',
    visual: 'shooting',
    label: 'DIÁRIA 03 // SET B',
  },
  {
    number: '06',
    title: 'EDIÇÃO',
    description: 'Seleção, montagem, som, motion, tratamento e finalização.',
    visual: 'editing',
    label: 'CORTE FINAL V7',
  },
  {
    number: '07',
    title: 'PUBLICAÇÃO',
    description: 'Adaptação, programação, distribuição e entrada no ar.',
    visual: 'publishing',
    label: 'AGENDADO // TODAS AS PRAÇAS',
  },
  {
    number: '08',
    title: 'REPERCUSSÃO',
    description: 'Acompanhamento da resposta, participação do público e novos desdobramentos.',
    visual: 'reaction',
    label: 'AUDIENCE ACTIVE',
  },
];
