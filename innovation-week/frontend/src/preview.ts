// A home da TENKA mostra esta página ao vivo dentro de um card (iframe). Nesse
// modo ela é só vitrine: não conta scan nem eventos e não consome a abertura.
export const isPreview: boolean = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true; // acesso ao topo bloqueado = está num iframe de outra origem
  }
})();
