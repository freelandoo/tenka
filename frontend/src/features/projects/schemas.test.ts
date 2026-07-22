import { describe, expect, it } from 'vitest';
import { collectAssigneeIds, projectFormSchema } from './schemas';

const valid = {
  name: 'Site institucional',
  description: 'Redesign completo',
  clientName: 'Acme Ltda',
  clientPhone: '11999998888',
  clientEmail: '',
  company: 'tenka' as const,
  value: '12.500,00',
  monthlyFee: '500,00',
  subscriptionActive: true,
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
