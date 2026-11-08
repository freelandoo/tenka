export interface FinanceReadinessInput {
  databaseConfigured: boolean;
  databaseReachable: boolean;
  databaseTlsVerified: boolean;
  nodeEnv: string;
  asaasConfigured: boolean;
  asaasEnvironment: 'sandbox' | 'production';
  webhookTokenConfigured: boolean;
  publicApiUrl: string;
  timeoutMs: number;
}

/** Inventario seguro da integracao: expõe presença/configuração, nunca segredos. */
export function financeReadiness(input: FinanceReadinessInput) {
  const warnings: string[] = [];
  if (!input.databaseConfigured) warnings.push('database-url-ausente');
  else if (!input.databaseReachable) warnings.push('database-indisponivel');
  if (!input.asaasConfigured) warnings.push('asaas-api-key-ausente');
  if (!input.webhookTokenConfigured) warnings.push('asaas-webhook-token-ausente');
  if (input.timeoutMs < 60_000) warnings.push('asaas-timeout-abaixo-de-60s');
  if (input.nodeEnv === 'production') {
    if (!input.publicApiUrl.startsWith('https://')) warnings.push('public-api-https-nao-confirmado');
    if (!input.databaseTlsVerified) warnings.push('database-tls-sem-validacao-de-certificado');
  }
  return {
    readyForFinancialOperations: warnings.length === 0,
    environment: input.asaasEnvironment,
    database: {
      configured: input.databaseConfigured,
      reachable: input.databaseReachable,
      tlsCertificateValidation: input.databaseTlsVerified,
    },
    asaas: {
      apiKeyConfigured: input.asaasConfigured,
      webhookTokenConfigured: input.webhookTokenConfigured,
      timeoutMs: input.timeoutMs,
    },
    publicApi: {
      configured: input.publicApiUrl.length > 0,
      https: input.publicApiUrl.startsWith('https://'),
    },
    warnings,
  };
}
