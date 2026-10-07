/**
 * Canais de contato, em um só lugar.
 *
 * Antes disso o número de WhatsApp vivia escrito à mão dentro de
 * `tech/sections/FinalDeploySection.tsx` — e era um placeholder
 * (`5511000000000`), ou seja, todo CTA de WhatsApp do site apontava para um
 * número inexistente.
 */

export const CONTACT_EMAIL = 'contato@tenka.com.br';

/**
 * Número no formato wa.me (DDI + DDD + número, só dígitos).
 *
 * TODO(operador): trocar pelo número real de atendimento. Enquanto for o
 * placeholder, `hasWhatsapp` devolve false e a interface mostra e-mail no lugar
 * de um link que não funciona.
 */
export const WHATSAPP_NUMBER = '5511000000000';

const PLACEHOLDER_NUMBERS = new Set(['5511000000000', '']);

export const hasWhatsapp = !PLACEHOLDER_NUMBERS.has(WHATSAPP_NUMBER);

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function mailtoUrl(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject });
  if (body) params.set('body', body);
  return `mailto:${CONTACT_EMAIL}?${params.toString()}`;
}
