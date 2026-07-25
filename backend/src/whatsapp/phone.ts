/**
 * Normalização de telefone e casamento com o cadastro do cliente.
 *
 * Porte de `src/lib/whatsapp/telefone.ts` do Coliseu. O WhatsApp entrega o
 * número em formatos variados (com DDI 55, com ou sem o 9º dígito do celular) e
 * o painel guarda o que o admin digitou em `projects.client_phone` —
 * "(11) 90000-0000", "11900000000", "5511900000000". Comparar strings cruas
 * criaria uma conversa nova a cada formato.
 *
 * A chave de comparação são os **últimos 8 dígitos**: sobrevive ao DDI e ao 9º
 * dígito, e na prática brasileira ainda carrega o final do DDD.
 */

export function onlyDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

/** Chave de casamento entre um número do WhatsApp e um telefone cadastrado. */
export function phoneKey(value: string | null | undefined): string {
  const d = onlyDigits(value);
  return d.length >= 8 ? d.slice(-8) : '';
}

/** JID de grupo — `120363...@g.us`. Conversa coletiva, nunca um cliente. */
export function isGroupJid(remoteJid: string | null | undefined): boolean {
  return /@g\.us$/i.test(String(remoteJid ?? '').trim());
}

/** JIDs que não são conversa 1:1 com uma pessoa — grupo, transmissão, status. */
export function isPersonJid(remoteJid: string | null | undefined): boolean {
  const jid = String(remoteJid ?? '').trim();
  if (!jid) return false;
  if (isGroupJid(jid)) return false;
  if (/@broadcast$/i.test(jid)) return false;
  if (/^status@/i.test(jid)) return false;
  return true;
}

/**
 * JIDs que viram conversa no atendimento: pessoa **ou** grupo. Transmissão e
 * status ficam de fora — não são conversa, são publicação de mão única.
 */
export function isConversationJid(remoteJid: string | null | undefined): boolean {
  return isGroupJid(remoteJid) || isPersonJid(remoteJid);
}

/**
 * Extrai o telefone de um JID. `@lid` é um identificador opaco que o WhatsApp
 * usa quando não expõe o número — devolve vazio, e a conversa fica sem telefone.
 * Grupo também: o `120363…` do JID tem cara de telefone, e tratá-lo como número
 * amarraria a conversa ao projeto errado.
 */
export function phoneFromJid(remoteJid: string | null | undefined): string {
  const jid = String(remoteJid ?? '').trim();
  if (!jid || /@lid$/i.test(jid) || isGroupJid(jid)) return '';
  const [part] = jid.split('@');
  const d = onlyDigits(part);
  return d.length >= 10 ? d : '';
}

/**
 * Telefone do cadastro → JID de conversa da Evolution. Assume Brasil quando o
 * número vem sem DDI, que é o caso de tudo digitado no painel.
 */
export function jidFromPhone(value: string | null | undefined): string {
  const d = onlyDigits(value);
  if (d.length < 10) return '';
  return `${d.startsWith('55') ? d : `55${d}`}@s.whatsapp.net`;
}

/** Formato de exibição: (11) 90000-0000, tolerando DDI e números curtos. */
export function formatPhone(value: string | null | undefined): string {
  const d = onlyDigits(value);
  const local = d.startsWith('55') && d.length > 11 ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return local || '';
}

/** Telefone em log nunca aparece inteiro (LGPD). */
export function redactPhone(value: string | null | undefined): string {
  const d = onlyDigits(value);
  return d.length <= 4 ? '****' : `****${d.slice(-4)}`;
}
