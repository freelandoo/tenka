import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { subscribeRealtime } from '../../lib/api/events';
import * as finance from './financeService';

/**
 * Alerta da fila do Asaas no topo do Financeiro.
 *
 * O resumo já existia, mas morava dentro de um acordeão fechado chamado
 * "Integração, assinaturas e últimas mensalidades" — um aviso de "ação
 * necessária" que só aparecia para quem já tinha ido procurar. Aqui ele fica no
 * caminho, e some sozinho quando não há nada parado. Consome a rota enxuta da
 * fila, não o overview inteiro.
 */
interface FinanceQueueAlertProps {
  /** Abre o painel técnico, onde estão os botões de reprocessar. */
  onOpenDetails(): void;
}

export function FinanceQueueAlert({ onOpenDetails }: FinanceQueueAlertProps) {
  const [queue, setQueue] = useState<finance.FinanceQueueHealth | null>(null);

  const load = useCallback(() => {
    finance.fetchFinanceQueue().then(setQueue).catch(() => setQueue(null));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeRealtime(
    ['project_subscriptions', 'project_payments', 'subscription_payments'],
    () => load(),
  ), [load]);

  if (!queue || queue.level === 'ok') return null;

  return (
    <div
      className={`finance-alert${queue.level === 'critical' ? ' finance-alert--critical' : ''}`}
      role="alert"
    >
      <AlertTriangle size={18} aria-hidden="true" />
      <div className="finance-alert__body">
        <strong>
          {queue.level === 'critical'
            ? 'A integração com o Asaas precisa de você'
            : 'A fila do Asaas está atrasada'}
        </strong>
        <ul>{queue.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <p style={{ margin: '4px 0 0' }}>
          <button type="button" className="panel-btn panel-btn--ghost" onClick={onOpenDetails}>
            Abrir a fila de atenção
          </button>
        </p>
      </div>
    </div>
  );
}
