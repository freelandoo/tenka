/**
 * Troca de cliente num projeto que já cobra pelo Asaas.
 *
 * O provedor não deixa trocar o cliente de uma cobrança nem de uma assinatura já
 * criada ("O cliente vinculado à cobrança não pode ser alterado após a criação").
 * Não existe, portanto, sincronização possível: se a Tenka apenas trocasse o
 * client_id, o painel passaria a mostrar um cliente e o Asaas continuaria
 * cobrando outro — e a conciliação acusaria a divergência sem ninguém entender.
 *
 * Então a troca é recusada enquanto houver vínculo vivo, e a saída é explícita:
 * cancelar a assinatura e as cobranças abertas, trocar o cliente e emitir de
 * novo. Cobranças já pagas ou canceladas não impedem nada — são história.
 */

export interface ProjectBillingBindings {
  /** Status local da assinatura, ou null quando o projeto não tem mensalidade. */
  subscriptionStatus: string | null;
  /** Id no Asaas; null significa que a recorrência nunca saiu daqui. */
  asaasSubscriptionId: string | null;
  /** Cobranças de etapa/parcela pendentes que já existem no Asaas. */
  openSyncedCharges: number;
}

export type ClientChangeBlock = 'subscription' | 'charges' | 'both' | null;

export function blocksClientChange(bindings: ProjectBillingBindings): ClientChangeBlock {
  const subscription = Boolean(bindings.asaasSubscriptionId)
    && bindings.subscriptionStatus !== 'cancelled';
  const charges = bindings.openSyncedCharges > 0;
  if (subscription && charges) return 'both';
  if (subscription) return 'subscription';
  if (charges) return 'charges';
  return null;
}

export function clientChangeMessage(block: Exclude<ClientChangeBlock, null>): string {
  const alvo = block === 'subscription' ? 'a assinatura'
    : block === 'charges' ? 'as cobranças abertas'
      : 'a assinatura e as cobranças abertas';
  return `O Asaas não permite trocar o cliente de ${alvo} deste projeto. `
    + `Cancele ${alvo} no Asaas, troque o cliente e emita de novo.`;
}
