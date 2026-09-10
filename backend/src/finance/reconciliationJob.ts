import { env, hasAsaas } from '../env';
import { defaultReconciliationWindow, runReconciliation } from './reconciliationRun';

/**
 * Conciliação periódica.
 *
 * A comparação com o Asaas existia só atrás de um botão, o que fazia dela uma
 * checagem que dependia de alguém lembrar. Uma divergência silenciosa — valor
 * alterado no painel do provedor, cobrança que nunca chegou — podia durar
 * semanas. O job roda a janela padrão sozinho e grava o snapshot que o painel
 * já sabia ler.
 */
let timer: NodeJS.Timeout | null = null;
let running = false;

export async function runScheduledReconciliation(): Promise<void> {
  if (running || !hasAsaas) return;
  running = true;
  try {
    const { dueDateFrom, dueDateTo } = defaultReconciliationWindow();
    await runReconciliation(dueDateFrom, dueDateTo, null);
  } finally {
    running = false;
  }
}

export const reconciliationJob = {
  start(onError: (error: unknown) => void): void {
    if (timer || !hasAsaas || env.financeReconciliationHours <= 0) return;
    const tick = () => void runScheduledReconciliation().catch(onError);
    // A primeira passada espera o boot assentar — migrations, pool, worker.
    setTimeout(tick, 60_000).unref();
    timer = setInterval(tick, env.financeReconciliationHours * 3_600_000);
  },
  stop(): void {
    if (timer) clearInterval(timer);
    timer = null;
  },
};
