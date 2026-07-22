import { z } from 'zod';
import { POSTIT_COLOR_KEYS } from './colors';
import { COMPANY_KEYS } from './companies';
import { parseCurrencyToCents } from '../panel/format';

/** Valida "yyyy-mm-dd" vindo de <input type="date">. */
function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

export const projectFormSchema = z
  .object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do projeto é obrigatório.')
    .max(120, 'O nome pode ter no máximo 120 caracteres.'),
  description: z.string().trim().max(4000, 'Descrição longa demais.'),
  /** Lead: nome do cliente (obrigatório) + telefone e/ou e-mail. */
  clientName: z
    .string()
    .trim()
    .min(1, 'O nome do cliente é obrigatório.')
    .max(120, 'Nome do cliente longo demais.'),
  clientPhone: z.string().trim().max(40, 'Telefone longo demais.'),
  clientEmail: z
    .string()
    .trim()
    .max(160, 'E-mail longo demais.')
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'E-mail inválido.'),
  company: z.enum(COMPANY_KEYS, { message: 'Escolha a empresa.' }),
  /** Texto do campo de moeda; convertido para centavos ao salvar. */
  value: z
    .string()
    .trim()
    .refine((raw) => raw === '' || parseCurrencyToCents(raw) !== null, {
      message: 'Informe um valor válido (ex.: 12.500,00).',
    }),
  /** Mensalidade recorrente (texto de moeda). Vazio = sem mensalidade. */
  monthlyFee: z
    .string()
    .trim()
    .refine((raw) => raw === '' || parseCurrencyToCents(raw) !== null, {
      message: 'Informe uma mensalidade válida (ex.: 500,00).',
    }),
  /** Cobrança recorrente ligada — soma na carteira enquanto marcada. */
  subscriptionActive: z.boolean(),
  dueDate: z
    .string()
    .min(1, 'A data de entrega é obrigatória.')
    .refine(isValidDateString, 'Data inválida.'),
  colorKey: z.enum(POSTIT_COLOR_KEYS as [string, ...string[]], {
    message: 'Escolha uma cor da paleta.',
  }),
  mainAssignee: z.string(),
  otherAssignees: z.array(z.string()),
  })
  .refine((v) => v.clientPhone.trim() !== '' || v.clientEmail.trim() !== '', {
    message: 'Informe pelo menos telefone ou e-mail do cliente.',
    path: ['clientPhone'],
  });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

/** Junta responsável principal + demais, sem duplicatas, preservando ordem. */
export function collectAssigneeIds(values: ProjectFormValues): string[] {
  const ids = [values.mainAssignee, ...values.otherAssignees].filter(Boolean);
  return Array.from(new Set(ids));
}
