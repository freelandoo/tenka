import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * `React.lazy` que não desiste na primeira falha de rede.
 *
 * O problema que isto resolve: as páginas pesadas (/games, /multimidia,
 * /desenvolvimento, /painel) são chunks separados. Quando alguém clica num card
 * da home e TROCA DE ABA, o Chrome desprioriza — e às vezes aborta — a
 * requisição do chunk daquela aba em segundo plano. O `import()` rejeita,
 * `React.lazy` propaga, e como nada captura o erro o React desmonta a árvore
 * inteira: sobra o `<div id="root">` vazio sobre o `#f15a24` que o index.html
 * pinta para evitar flash branco. Resultado: página 100% laranja.
 *
 * Duas defesas, nesta ordem:
 *
 * 1. Se a aba está escondida, ESPERA ela voltar antes de tentar de novo. Tentar
 *    enquanto ainda está em segundo plano só queima tentativa — é exatamente o
 *    estado em que o navegador está bloqueando a requisição.
 * 2. Backoff curto entre tentativas, para o caso de instabilidade de rede.
 *
 * LIMITE MEDIDO (não é teoria): o module map do navegador memoiza o resultado
 * de `import()` por especificador, inclusive a REJEIÇÃO. Instrumentando o
 * cenário real, três tentativas produziram só duas idas à rede — da terceira em
 * diante o navegador devolveu a falha em cache sem refazer a requisição. Ou
 * seja, este retry compra UMA segunda chance, não N. Quem de fato resolve o
 * caso perdido é o RouteErrorBoundary, que recarrega a página uma vez (a recarga
 * limpa o module map) e, se ainda assim falhar, mostra uma tela com saída.
 */

/** Resolve quando a aba estiver visível (imediatamente, se já estiver). */
function esperarAbaVisivel(): Promise<void> {
  if (typeof document === 'undefined' || !document.hidden) return Promise.resolve();
  return new Promise((resolve) => {
    const aoVoltar = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', aoVoltar);
      resolve();
    };
    document.addEventListener('visibilitychange', aoVoltar);
  });
}

const espera = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface LazyRetryOptions {
  /** Total de tentativas, incluindo a primeira. */
  tentativas?: number;
  /** Base do backoff em ms — a n-ésima espera é `atraso * n`. */
  atraso?: number;
}

export async function importarComRetry<T>(
  factory: () => Promise<T>,
  { tentativas = 3, atraso = 400 }: LazyRetryOptions = {},
): Promise<T> {
  let ultimoErro: unknown;
  for (let n = 1; n <= tentativas; n += 1) {
    try {
      return await factory();
    } catch (erro) {
      ultimoErro = erro;
      if (n === tentativas) break;
      // A aba escondida É a causa provável; não gaste tentativa às cegas.
      await esperarAbaVisivel();
      await espera(atraso * n);
    }
  }
  throw ultimoErro;
}

/** Troca direta por `lazy()` nas rotas que carregam chunk próprio. */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  options?: LazyRetryOptions,
): LazyExoticComponent<T> {
  return lazy(() => importarComRetry(factory, options));
}
