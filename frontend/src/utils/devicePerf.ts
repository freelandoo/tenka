/**
 * O preview ao vivo da vitrine carrega uma página inteira dentro de um iframe
 * (Three.js incluso, no caso de /games). Em conexão econômica ou aparelho com
 * pouca memória isso custa mais do que entrega: o card continua lá, com a cor
 * sólida e o rótulo da divisão, só não roda o site de verdade dentro dele.
 */
export function canRunLivePreview(): boolean {
  if (typeof navigator === 'undefined') return false;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

  if (nav.connection?.saveData) return false;
  return (nav.deviceMemory ?? 8) > 2;
}
