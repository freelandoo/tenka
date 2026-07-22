import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuração de testes separada do vite.config.ts para não interferir
// no build de produção do site.
export default defineConfig({
  plugins: [react()],
  test: {
    // globals habilita o afterEach global que o Testing Library usa para
    // fazer cleanup automático do DOM entre os testes.
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
