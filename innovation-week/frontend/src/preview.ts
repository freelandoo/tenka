// Esta página às vezes roda dentro de um iframe:
// - no card da home e no fliperama do portfólio da TENKA → é só vitrine: não
//   conta scan, eventos nem recorde, e não consome a abertura (isPreview);
// - no fliperama da própria landing (jogo?arcade=1) → é o jogo de verdade, com
//   recorde valendo no ranking; só as saídas para outras páginas somem.

export const isEmbedded: boolean = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true; // acesso ao topo bloqueado = está num iframe de outra origem
  }
})();

const isArcade: boolean = (() => {
  try {
    return new URLSearchParams(window.location.search).get('arcade') === '1';
  } catch {
    return false;
  }
})();

export const isPreview: boolean = isEmbedded && !isArcade;

// Marca o documento para o CSS esconder o que só faz sentido na página inteira
// (ex.: "voltar ao site", que navegaria dentro do card/fliperama).
if (isEmbedded && typeof document !== 'undefined') document.documentElement.dataset.preview = '';
