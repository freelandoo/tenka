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

export const COMPANY_NAME = 'Tenka Group';
export const CONTACT_EMAIL = 'grupotenka@gmail.com';

/** Dígitos puros, formato wa.me (DDI + DDD + número). */
export const WHATSAPP_NUMBER = '5511984274134';

/** Formato E.164, para `telephone` do schema.org e para `tel:`. */
export const PHONE_E164 = '+5511984274134';

/** Como o telefone aparece para o leitor. */
export const PHONE_DISPLAY = '(11) 98427-4134';

/**
 * Negócio com ÁREA DE ATENDIMENTO, não loja.
 *
 * A equipe trabalha a partir de Pinheiros, mas não recebe cliente no endereço —
 * atendimento é remoto ou no cliente. Nesse caso o Google pede perfil de área
 * de atendimento com o endereço oculto, e publicar logradouro no site
 * contradiria a própria ficha: `streetAddress` no schema sinaliza um lugar que
 * o cliente pode visitar.
 *
 * Por isso o logradouro e o CEP ficam aqui apenas para uso administrativo
 * (nota fiscal, contrato, cadastro) e NÃO entram no site nem no JSON-LD. O que
 * é público é a praça e a área atendida.
 */
export const ADDRESS = {
  locality: 'São Paulo',
  region: 'SP',
  country: 'BR',
} as const;

/** Uso interno — nunca renderizado nem publicado em dado estruturado. */
export const BILLING_ADDRESS = {
  street: 'R. Pais Leme, 215',
  district: 'Pinheiros',
  locality: 'São Paulo',
  region: 'SP',
  postalCode: '05424-150',
  country: 'BR',
} as const;

/** Como a praça aparece para o leitor. */
export const LOCATION_LINE = `${ADDRESS.locality} — ${ADDRESS.region}, Brasil`;

/** Regiões atendidas presencialmente, espelhando a ficha do Google. */
export const SERVICE_AREAS = [
  'São Paulo',
  'Região metropolitana de São Paulo',
];

/** Projetos digitais são entregues remotamente para todo o país. */
export const REMOTE_AREA = 'Brasil';

/**
 * Perfis oficiais. Alimentam o `sameAs` do Organization: é assim que buscador e
 * motor de IA ligam site, redes e ficha do Google como a mesma entidade.
 */
export const SOCIAL_PROFILES = [
  'https://www.instagram.com/grupo.tenka/',
  'https://www.facebook.com/profile.php?id=61593466682541',
  'https://www.linkedin.com/company/tenkagroup/',
];

export const hasWhatsapp = /^\d{12,13}$/.test(WHATSAPP_NUMBER);

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function mailtoUrl(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject });
  if (body) params.set('body', body);
  return `mailto:${CONTACT_EMAIL}?${params.toString()}`;
}
