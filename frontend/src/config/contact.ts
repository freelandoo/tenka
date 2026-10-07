/**
 * NAP (nome, endereço, telefone) e canais — fonte única.
 *
 * Isto é SEO local, não só configuração: Google, Google Business Profile,
 * diretórios e os motores de busca por IA cruzam nome, endereço e telefone
 * entre si. Dois formatos diferentes do mesmo telefone em páginas diferentes
 * enfraquecem o sinal. Por isso o endereço e o número existem num lugar só, e
 * tudo mais — rodapé, JSON-LD, página de contato, botão de WhatsApp — deriva
 * daqui.
 */

export const COMPANY_NAME = 'TENKA Group';
export const CONTACT_EMAIL = 'grupotenka@gmail.com';

/** Dígitos puros, formato wa.me (DDI + DDD + número). */
export const WHATSAPP_NUMBER = '5511984274134';

/** Formato E.164, para `telephone` do schema.org e para `tel:`. */
export const PHONE_E164 = '+5511984274134';

/** Como o telefone aparece para o leitor. */
export const PHONE_DISPLAY = '(11) 98427-4134';

export const ADDRESS = {
  street: 'R. Pais Leme, 215',
  district: 'Pinheiros',
  locality: 'São Paulo',
  region: 'SP',
  postalCode: '05424-150',
  country: 'BR',
} as const;

/** Uma linha, o jeito que o endereço precisa aparecer em rodapé e diretório. */
export const ADDRESS_LINE = `${ADDRESS.street} — ${ADDRESS.district}, ${ADDRESS.locality} — ${ADDRESS.region}, ${ADDRESS.postalCode}`;

export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${ADDRESS.street}, ${ADDRESS.district}, ${ADDRESS.locality} - ${ADDRESS.region}, ${ADDRESS.postalCode}`,
)}`;

export const hasWhatsapp = /^\d{12,13}$/.test(WHATSAPP_NUMBER);

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function mailtoUrl(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject });
  if (body) params.set('body', body);
  return `mailto:${CONTACT_EMAIL}?${params.toString()}`;
}
