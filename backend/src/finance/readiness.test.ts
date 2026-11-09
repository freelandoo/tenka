import { describe, expect, it } from 'vitest';
import { financeReadiness } from './readiness';

const complete = {
  databaseConfigured: true,
  databaseReachable: true,
  databaseTlsVerified: true,
  nodeEnv: 'production',
  asaasConfigured: true,
  asaasEnvironment: 'production' as const,
  webhookTokenConfigured: true,
  publicApiUrl: 'https://api.example.com',
  panelUrl: 'https://painel.example.com',
  timeoutMs: 60_000,
};

describe('financeReadiness', () => {
  it('confirma apenas uma configuracao financeira completa', () => {
    expect(financeReadiness(complete)).toMatchObject({
      readyForFinancialOperations: true,
      environment: 'production',
      warnings: [],
    });
  });

  it('lista bloqueios sem revelar valores de credenciais', () => {
    const result = financeReadiness({
      ...complete,
      asaasConfigured: false,
      webhookTokenConfigured: false,
      publicApiUrl: 'http://api.example.com',
      panelUrl: '',
      databaseTlsVerified: false,
      timeoutMs: 15_000,
    });
    expect(result.readyForFinancialOperations).toBe(false);
    expect(result.warnings).toEqual(expect.arrayContaining([
      'asaas-api-key-ausente',
      'asaas-webhook-token-ausente',
      'asaas-timeout-abaixo-de-60s',
      'public-api-https-nao-confirmado',
      'panel-url-https-nao-confirmado',
      'database-tls-sem-validacao-de-certificado',
    ]));
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
