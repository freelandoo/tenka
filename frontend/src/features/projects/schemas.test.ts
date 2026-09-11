import { describe, expect, it } from 'vitest';
import { collectAssigneeIds, projectFormSchema } from './schemas';

const valid = {
  name: 'Site institucional',
  description: 'Redesign completo',
  clientId: '',
  clientName: 'Acme Ltda',
  clientPhone: '11999998888',
  clientEmail: '',
  clientCpfCnpj: '',
  company: 'tenka' as const,
  value: '12.500,00',
  monthlyFee: '500,00',
  dueDay: '10',
  dueDate: '2026-09-30',
  colorKey: 'azul',
  mainAssignee: 'user-1',
  otherAssignees: ['user-2'],
};

describe('projectFormSchema', () => {
  it('aceita um projeto válido', () => {
    expect(projectFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejeita nome vazio', () => {
    expect(projectFormSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('rejeita data inválida', () => {
    expect(projectFormSchema.safeParse({ ...valid, dueDate: '' }).success).toBe(false);
    expect(projectFormSchema.safeParse({ ...valid, dueDate: '30/09/2026' }).success).toBe(false);
    expect(projectFormSchema.safeParse({ ...valid, dueDate: '2026-13-99' }).success).toBe(false);
  });

  it('rejeita valor negativo ou inválido', () => {
    expect(projectFormSchema.safeParse({ ...valid, value: '-100' }).success).toBe(false);
    expect(projectFormSchema.safeParse({ ...valid, value: 'muito caro' }).success).toBe(false);
  });

  it('rejeita telefone, e-mail e CPF/CNPJ inválidos', () => {
    expect(projectFormSchema.safeParse({ ...valid, clientPhone: '99999-8888' }).success).toBe(false);
    expect(projectFormSchema.safeParse({ ...valid, clientEmail: 'cliente@exemplo' }).success).toBe(false);
    expect(projectFormSchema.safeParse({ ...valid, clientCpfCnpj: '123.456.789-00' }).success).toBe(false);
  });

  it('aceita telefone colado com +55 e CPF/CNPJ válidos', () => {
    expect(projectFormSchema.safeParse({
      ...valid,
      clientPhone: '+55 (11) 99999-8888',
      clientCpfCnpj: '123.456.789-09',
    }).success).toBe(true);
    expect(projectFormSchema.safeParse({
      ...valid,
      clientCpfCnpj: '11.222.333/0001-81',
    }).success).toBe(true);
  });

  it('exige vencimento quando existe mensalidade', () => {
    expect(projectFormSchema.safeParse({ ...valid, dueDay: '' }).success).toBe(false);
    expect(projectFormSchema.safeParse({ ...valid, dueDay: '32' }).success).toBe(false);
  });

  it('aceita mensalidade vazia ou zero sem exigir vencimento', () => {
    expect(projectFormSchema.safeParse({ ...valid, monthlyFee: '', dueDay: '' }).success).toBe(true);
    expect(projectFormSchema.safeParse({ ...valid, monthlyFee: '0', dueDay: '' }).success).toBe(true);
  });

  it('rejeita cor fora da paleta', () => {
    expect(projectFormSchema.safeParse({ ...valid, colorKey: 'dourado' }).success).toBe(false);
  });
});

describe('collectAssigneeIds', () => {
  it('une principal + demais sem duplicatas', () => {
    expect(
      collectAssigneeIds({ ...valid, mainAssignee: 'u1', otherAssignees: ['u2', 'u1', 'u3'] }),
    ).toEqual(['u1', 'u2', 'u3']);
  });

  it('ignora principal vazio', () => {
    expect(collectAssigneeIds({ ...valid, mainAssignee: '', otherAssignees: ['u2'] })).toEqual([
      'u2',
    ]);
  });
});
