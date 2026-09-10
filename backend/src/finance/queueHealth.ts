/**
 * Saúde da fila do Asaas.
 *
 * A fila é assíncrona de propósito: nenhuma tela espera o provedor responder.
 * O preço disso é que uma fila parada é silenciosa — a cobrança simplesmente
 * não sai, e só se descobre quando o cliente reclama. Este resumo existe para o
 * painel gritar antes disso.
 *
 * "Esgotada" e "em revisão" são críticas porque nada mais acontece sozinho:
 * a operação desistiu de tentar, ou o webhook chegou sem alvo conhecido. As
 * demais são atenção: ainda podem se resolver na próxima passagem do worker.
 */

export interface QueueHealthCounts {
  /** Operações pendentes/processando paradas há tempo demais. */
  stalledOperations: number;
  /** Operações que gastaram todas as tentativas. */
  exhaustedOperations: number;
  /** Operações cujo resultado no provedor ficou indefinido. */
  uncertainOperations: number;
  /** Webhooks sem alvo reconhecido, aguardando decisão humana. */
  needsReviewEvents: number;
  /** Webhooks recebidos e ainda não processados há tempo demais. */
  stalledEvents: number;
}

export type QueueAlertLevel = 'ok' | 'attention' | 'critical';

export interface QueueAlert {
  level: QueueAlertLevel;
  reasons: string[];
}

export function queueAlert(counts: QueueHealthCounts): QueueAlert {
  const reasons: string[] = [];
  if (counts.exhaustedOperations > 0) {
    reasons.push(`${counts.exhaustedOperations} operação(ões) desistiram após todas as tentativas.`);
  }
  if (counts.needsReviewEvents > 0) {
    reasons.push(`${counts.needsReviewEvents} webhook(s) sem alvo reconhecido aguardando revisão.`);
  }
  const critical = reasons.length > 0;
  if (counts.stalledOperations > 0) {
    reasons.push(`${counts.stalledOperations} operação(ões) na fila sem sair há mais de 15 minutos.`);
  }
  if (counts.stalledEvents > 0) {
    reasons.push(`${counts.stalledEvents} webhook(s) recebidos e ainda não processados.`);
  }
  if (counts.uncertainOperations > 0) {
    reasons.push(`${counts.uncertainOperations} operação(ões) com resultado indefinido no Asaas.`);
  }
  if (critical) return { level: 'critical', reasons };
  return { level: reasons.length > 0 ? 'attention' : 'ok', reasons };
}
