import { z } from 'zod';
import { POSTIT_COLOR_KEYS } from '../projects/colors';

export const dailyTaskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Escreva o que será feito.')
    .max(120, 'O título pode ter no máximo 120 caracteres.'),
  description: z.string().trim().max(2000, 'Descrição longa demais.'),
  colorKey: z.enum(POSTIT_COLOR_KEYS as [string, ...string[]], {
    message: 'Escolha uma cor da paleta.',
  }),
  /** '' = tarefa avulsa; caso contrário, o id do projeto vinculado. */
  projectId: z.string(),
  /** Obrigatório na tela, ainda que a coluna aceite null (ver migration 0009). */
  assigneeId: z.string().min(1, 'Escolha quem é o responsável.'),
});

export type DailyTaskFormValues = z.infer<typeof dailyTaskFormSchema>;
