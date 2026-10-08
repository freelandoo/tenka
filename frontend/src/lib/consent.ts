/**
 * Consentimento de cookies (LGPD).
 *
 * Base legal adotada para a medição de audiência: **legítimo interesse**. O guia
 * orientativo da ANPD sobre cookies admite essa base quando o tratamento se
 * limita a identificar padrões e tendências com dados agregados, sem cruzamento
 * com outros rastreadores e sem formação de perfis — que é exatamente o uso do
 * GA4 aqui: sem Google Ads vinculado, sem remarketing, sem perfilamento.
 *
 * Por isso o analytics nasce ligado e existe uma recusa que desliga de verdade,
 * em vez de um bloqueio total antes do aceite. Os cookies de publicidade nascem
 * negados, porque para publicidade a ANPD entende que o legítimo interesse
 * dificilmente é a base adequada.
 *
 * O padrão inicial é aplicado no inline script do index.html, antes do `config`
 * do gtag — se fosse aplicado só aqui, quem recusou já teria sido medido antes
 * do React montar. Este módulo cuida da escolha posterior e da revogação.
 */

export const CONSENT_STORAGE_KEY = 'tenka.consent.analytics';

export type ConsentChoice = 'granted' | 'denied';

/** `null` = a pessoa ainda não respondeu, então o aviso deve aparecer. */
export function readConsent(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    // Janela anônima ou storage bloqueado: trata como ainda não respondido.
    return null;
  }
}

/**
 * Grava a escolha e avisa o gtag na hora.
 *
 * O `consent update` é o que faz a recusa valer na mesma visita; sem ele a
 * pessoa só deixaria de ser medida no próximo carregamento, e a revogação
 * prevista na LGPD seria só aparente.
 */
export function writeConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Sem storage a escolha não sobrevive à sessão, mas ainda vale para esta.
  }
  window.gtag?.('consent', 'update', { analytics_storage: choice });
}
