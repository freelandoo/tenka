import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  erro: Error | null;
}

/** Marca a recarga automática já gasta — some quando a aba fecha. */
const CHAVE_RECARGA = 'tenka:chunk-reload';

export function ehFalhaDeChunk(erro: { message?: string }): boolean {
  return /dynamically imported module|Loading chunk|Importing a module script failed|error loading dynamically imported module/i.test(
    erro.message ?? '',
  );
}

/**
 * Recarrega UMA vez por sessão quando o chunk não veio.
 *
 * A recarga é o que realmente conserta: ela limpa o module map do navegador, que
 * memoiza o `import()` rejeitado e faz as tentativas seguintes nem chegarem à
 * rede. O `sessionStorage` é o que impede laço infinito — se depois de recarregar
 * o chunk continuar faltando (deploy quebrado, offline), a segunda passada cai na
 * tela de erro em vez de recarregar para sempre.
 */
function tentarRecarregarUmaVez(): boolean {
  try {
    if (sessionStorage.getItem(CHAVE_RECARGA)) return false;
    sessionStorage.setItem(CHAVE_RECARGA, String(Date.now()));
  } catch {
    // sessionStorage bloqueado (modo restrito): sem guarda contra laço, não
    // recarrega. Melhor uma tela de erro do que um ciclo infinito.
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Rede de segurança das rotas.
 *
 * Sem isto, QUALQUER erro que escape de um componente de rota faz o React
 * desmontar a árvore inteira e deixar o `<div id="root">` vazio — a tela some e
 * fica só o `#f15a24` que o index.html pinta contra o flash branco. Foi
 * exatamente esse o bug da página laranja: o chunk de /desenvolvimento falhava
 * ao carregar numa aba em segundo plano e o site inteiro sumia, sem mensagem.
 *
 * Falha de chunk ganha texto próprio porque a ação certa é diferente: recarregar
 * costuma resolver (rede instável, ou um deploy novo que trocou os arquivos),
 * enquanto um erro de render tende a persistir.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Sem serviço de telemetria no projeto; o console é onde isto é investigado.
    console.error('[TENKA] erro de rota:', erro, info.componentStack);
    // Chunk que não veio quase sempre volta numa recarga limpa — tenta sozinho
    // antes de jogar a tela de erro na cara de quem só queria ver o site.
    if (ehFalhaDeChunk(erro)) tentarRecarregarUmaVez();
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    const falhaDeChunk = ehFalhaDeChunk(erro);

    return (
      <div
        role="alert"
        className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6 text-center"
        style={{ backgroundColor: '#0d0d10', color: '#e7e7ea' }}
      >
        <p
          style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.28em', fontSize: 10 }}
          className="text-[#f15a24]"
        >
          TENKA
        </p>

        <h1 className="max-w-lg text-2xl font-bold">
          {falhaDeChunk ? 'Não foi possível carregar esta página' : 'Algo deu errado por aqui'}
        </h1>

        <p className="max-w-md text-sm leading-relaxed text-white/60">
          {falhaDeChunk
            ? 'O download de uma parte do site foi interrompido — costuma acontecer quando a aba fica em segundo plano ou a conexão oscila. Já tentamos recarregar automaticamente; se você está vendo esta tela, a segunda tentativa também não passou.'
            : 'A página encontrou um erro inesperado. Recarregar costuma resolver; se insistir, avise a gente.'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[44px] rounded-full bg-[#f15a24] px-6 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#ff7a30]"
          >
            Recarregar
          </button>
          <a
            href="/"
            className="min-h-[44px] rounded-full border border-white/25 px-6 text-[11px] font-bold uppercase leading-[44px] tracking-[0.14em] text-white/80 transition-colors hover:bg-white/10"
          >
            Ir para a home
          </a>
        </div>

        <details className="mt-2 max-w-lg text-left">
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.14em] text-white/35">
            Detalhes técnicos
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-white/45">
            {erro.message}
          </pre>
        </details>
      </div>
    );
  }
}
