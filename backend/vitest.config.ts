import { defineConfig } from 'vitest/config';

/**
 * Testes do backend: só os módulos puros e a invariante de arquitetura do
 * WhatsApp. Nada aqui toca banco ou rede — o E2E contra Postgres real continua
 * sendo script de scratchpad (ver docs/MIGRACAO-VERCEL-RAILWAY.md).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
