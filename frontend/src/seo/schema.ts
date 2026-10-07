/**
 * JSON-LD. Montado a partir do mesmo manifesto de rotas, para não haver duas
 * versões da verdade sobre nome, URL ou serviços da TENKA.
 *
 * Só declaramos o que é verificável no site. Nada de `aggregateRating`,
 * `review` ou `foundingDate` inventado: dado estruturado falso é penalizável e,
 * pior, some do rich result sem avisar.
 */
import {
  ADDRESS,
  CONTACT_EMAIL,
  PHONE_E164,
  SOCIAL_PROFILES,
} from '../config/contact';
import {
  ROUTES,
  SITE_NAME,
  SITE_URL,
  canonicalFor,
  type SeoRoute,
} from './routes';

/** Endereço postal completo — reaproveitado por Organization e LocalBusiness. */
function postalAddress() {
  return {
    '@type': 'PostalAddress',
    streetAddress: ADDRESS.street,
    addressLocality: ADDRESS.locality,
    addressRegion: ADDRESS.region,
    postalCode: ADDRESS.postalCode,
    addressCountry: ADDRESS.country,
  };
}

type Json = Record<string, unknown>;

const DIVISIONS = [
  { path: '/games', name: 'TENKA Games' },
  { path: '/studios', name: 'TENKA Studios' },
  { path: '/tech', name: 'TENKA Tech' },
];

export function organizationSchema(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: 'TENKA',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/images/brand/tenka-group.svg`,
    image: `${SITE_URL}/images/og/tenka-group.jpg`,
    email: CONTACT_EMAIL,
    telephone: PHONE_E164,
    address: postalAddress(),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: PHONE_E164,
      email: CONTACT_EMAIL,
      areaServed: 'BR',
      availableLanguage: ['Portuguese'],
    },
    sameAs: SOCIAL_PROFILES,
    areaServed: { '@type': 'Country', name: 'Brasil' },
    department: DIVISIONS.map((division) => ({
      '@type': 'Organization',
      name: division.name,
      url: canonicalFor(division.path),
    })),
  };
}

export function websiteSchema(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    inLanguage: 'pt-BR',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

/** Página de divisão: o `highlights` do manifesto vira o catálogo de serviços. */
export function serviceSchema(route: SeoRoute): Json | null {
  if (!route.highlights?.length || route.path === '/') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: route.h1,
    description: route.description,
    url: canonicalFor(route.path),
    serviceType: route.highlights.map((item) => item.split('—')[0].trim()),
    provider: { '@id': `${SITE_URL}/#organization` },
    areaServed: { '@type': 'Country', name: 'Brasil' },
  };
}

export function breadcrumbSchema(route: SeoRoute, all: SeoRoute[]): Json | null {
  if (route.path === '/') return null;

  // Uma página de serviço vive sob a divisão (/games/treinamento-...), então a
  // trilha tem três níveis. Derivamos do próprio caminho em vez de declarar o
  // pai à mão, que é o tipo de duplicata que sai de sincronia.
  const segments = route.path.split('/').filter(Boolean);
  const trail: SeoRoute[] = [];
  for (let i = 1; i <= segments.length; i += 1) {
    const path = `/${segments.slice(0, i).join('/')}`;
    const match = all.find((item) => item.path === path);
    if (match) trail.push(match);
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
      ...trail.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.h1,
        item: canonicalFor(item.path),
      })),
    ],
  };
}

/** Só na `/contato`: é a única página com NAP e canal de atendimento. */
export function localBusinessSchema(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE_URL}/#localbusiness`,
    name: SITE_NAME,
    url: canonicalFor('/contato'),
    email: CONTACT_EMAIL,
    telephone: PHONE_E164,
    image: `${SITE_URL}/images/og/tenka-group.jpg`,
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
    address: postalAddress(),
    areaServed: { '@type': 'Country', name: 'Brasil' },
    // Sem openingHours, priceRange nem aggregateRating: não temos o dado, e
    // schema inventado some do rich result sem avisar — ou pior, fica.
  };
}

export function faqSchema(items?: { question: string; answer: string }[]): Json | null {
  if (!items?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** Todos os blocos que uma rota deve publicar, na ordem. */
export function schemasFor(route: SeoRoute): Json[] {
  const blocks: (Json | null)[] =
    route.path === '/'
      ? [organizationSchema(), websiteSchema()]
      : [breadcrumbSchema(route, ROUTES), serviceSchema(route)];
  if (route.path === '/contato') blocks.push(localBusinessSchema());
  blocks.push(faqSchema(route.faq));
  return blocks.filter((block): block is Json => block !== null);
}
