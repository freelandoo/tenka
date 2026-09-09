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
}

export interface PlanRowCurrent {
  id: string;
  position: number;
}

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
