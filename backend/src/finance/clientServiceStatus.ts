/**
 * Ciclo de vida de um serviço recorrente do cliente.
 *
 * Registros com impacto financeiro não somem: um serviço encerra ou é
 * arquivado, mas o histórico de cobranças já emitidas permanece. As transições
 * abaixo são as únicas permitidas — qualquer outra é recusada pela API, para
 * não reativar em silêncio um serviço encerrado (ver prompt §6 e §15).
 */

export type ClientServiceStatus = 'draft' | 'active' | 'paused' | 'ended' | 'archived';

const ALLOWED: Record<ClientServiceStatus, ClientServiceStatus[]> = {
  draft: ['active', 'archived'],
  active: ['paused', 'ended'],
  paused: ['active', 'ended'],
  ended: ['archived'],
  // Arquivado é terminal: reativar exige recriar, preservando o período antigo.
  archived: [],
};

export function isClientServiceStatus(value: string): value is ClientServiceStatus {
  return value in ALLOWED;
}

export function canTransitionClientService(from: ClientServiceStatus, to: ClientServiceStatus): boolean {
  return ALLOWED[from].includes(to);
}
