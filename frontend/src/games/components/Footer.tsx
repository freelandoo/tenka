import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer id="rodape" className="relative z-10 border-t border-white/10 bg-[var(--wf-bg-elev)]/80 py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        <div>
          <p className="wf-display text-lg font-bold">
            TENKA<span className="text-[var(--wf-energy)]">//</span>GAMES
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--wf-text-dim)]">
            Divisão de desenvolvimento de games do grupo TENKA. Mundos, sistemas e experiências
            interativas.
          </p>
        </div>

        <div>
          <h3 className="wf-mono text-[10px] tracking-[0.3em] text-[var(--wf-text-dim)]">CONTATO</h3>
          <address className="mt-4 flex flex-col gap-2 text-sm not-italic text-[var(--wf-text-dim)]">
            <a href="mailto:contato@tenka.com.br" className="transition-colors hover:text-[var(--wf-text)]">
              contato@tenka.com.br
            </a>
            <span>São Paulo — Brasil</span>
          </address>
        </div>

        <div>
          <h3 className="wf-mono text-[10px] tracking-[0.3em] text-[var(--wf-text-dim)]">GRUPO TENKA</h3>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            <li>
              <Link to="/" className="text-[var(--wf-text-dim)] transition-colors hover:text-[var(--wf-text)]">
                Página inicial
              </Link>
            </li>
            <li>
              <Link to="/multimidia" className="text-[var(--wf-text-dim)] transition-colors hover:text-[var(--wf-text)]">
                Tenka Multimídia
              </Link>
            </li>
            <li>
              <Link to="/desenvolvimento" className="text-[var(--wf-text-dim)] transition-colors hover:text-[var(--wf-text)]">
                Tenka Desenvolvimento
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="wf-mono text-[10px] tracking-[0.3em] text-[var(--wf-text-dim)]">SISTEMA</h3>
          <p className="wf-mono mt-4 text-[10px] leading-relaxed text-[var(--wf-text-dim)]">
            BUILD TENKA-01
            <br />
            RENDER: REAL TIME
            <br />© {new Date().getFullYear()} TENKA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
