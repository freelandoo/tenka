/**
 * Diferença entre o plano de pagamentos gravado e o que o painel enviou.
 *
 * A rota gravava o plano apagando todas as linhas do projeto e reinserindo a
 * lista recebida. Enquanto o id da linha era apenas interno isso não fazia
 * diferença. Quando a linha passar a carregar o id da cobrança no Asaas,
 * recriá-la significa orfanar a cobrança lá — e duplicá-la na ressincronização.
 *
 * Aqui a linha é identificada pelo id que o próprio painel devolve: quem vem
 * com id é atualizado, quem vem sem id é criado, e o que sumiu do corpo é
 * removido. A posição é sempre a ordem do corpo.
 */

export interface PlanRowInput {
  /** Ausente numa linha nova; presente numa linha que já existe no banco. */
  id?: string;
  name: string;
  description: string;
  amountCents: number;
  dueDate: string | null;
  kind?: 'stage' | 'installment';
  installmentGroupId?: string | null;
  installmentNumber?: number | null;
  installmentCount?: number | null;
  groupLabel?: string;
}

export interface PlanRowCurrent {
  id: string;
  position: number;
}

export interface ProtectedPlanRow extends PlanRowCurrent {
  name: string;
  description: string;
  amountCents: number;
  dueDate: string | null;
  kind: 'stage' | 'installment';
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  groupLabel: string;
  status: string;
  syncStatus: string;
}

export type ProtectedPlanChangeError = 'linha-paga-imutavel' | 'linha-sincronizada-imutavel';

export interface PlanCreate {
  position: number;
  row: PlanRowInput;
}

export interface PlanUpdate {
  id: string;
  position: number;
  row: PlanRowInput;
}

export type PlanDiffError = 'linha-desconhecida' | 'linha-repetida';

export type PlanDiff =
  | { error: PlanDiffError }
  | { error: null; create: PlanCreate[]; update: PlanUpdate[]; remove: string[] };

/**
 * Um id que não pertence ao plano — ou repetido no mesmo corpo — significa que
 * o painel está com uma versão antiga em tela. Recusar é mais seguro do que
 * adivinhar: tratar o id desconhecido como linha nova criaria uma cobrança a
 * mais para um valor que já estava distribuído.
 */
export function planDiff(current: PlanRowCurrent[], desired: PlanRowInput[]): PlanDiff {
  const known = new Set(current.map((row) => row.id));
  const seen = new Set<string>();
  const create: PlanCreate[] = [];
  const update: PlanUpdate[] = [];

  for (const [position, row] of desired.entries()) {
    if (row.id === undefined) {
      create.push({ position, row });
      continue;
    }
    if (!known.has(row.id)) return { error: 'linha-desconhecida' };
    if (seen.has(row.id)) return { error: 'linha-repetida' };
    seen.add(row.id);
    update.push({ id: row.id, position, row });
  }

  return {
    error: null,
    create,
    update,
    remove: current.filter((row) => !seen.has(row.id)).map((row) => row.id),
  };
}

function sameFinancialRow(current: ProtectedPlanRow, desired: PlanRowInput): boolean {
  return current.name === desired.name
    && current.description === desired.description
    && current.amountCents === desired.amountCents
    && current.dueDate === desired.dueDate
    && current.kind === (desired.kind ?? 'stage')
    && current.installmentGroupId === (desired.installmentGroupId ?? null)
    && current.installmentNumber === (desired.installmentNumber ?? null)
    && current.installmentCount === (desired.installmentCount ?? null)
    && current.groupLabel === (desired.groupLabel ?? '');
}

/** Linhas pagas ou ja enviadas ao Asaas podem ser reordenadas, mas nao reescritas/removidas. */
export function protectedPlanChangeError(
  current: ProtectedPlanRow[],
  desired: PlanRowInput[],
): ProtectedPlanChangeError | null {
  const desiredById = new Map(
    desired.filter((row): row is PlanRowInput & { id: string } => row.id !== undefined)
      .map((row) => [row.id, row]),
  );
  for (const row of current) {
    const incoming = desiredById.get(row.id);
    const changedOrRemoved = !incoming || !sameFinancialRow(row, incoming);
    if (!changedOrRemoved) continue;
    if (row.status === 'paid') return 'linha-paga-imutavel';
    if (row.syncStatus !== 'local') return 'linha-sincronizada-imutavel';
  }
  return null;
}
