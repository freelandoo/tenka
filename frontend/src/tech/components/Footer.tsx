import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[var(--tbe-bg-2)]/90 py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        <div>
          <p className="tbe-display text-lg font-bold">
            TENKA <span className="tbe-mono text-[10px] font-normal tracking-[0.3em] text-[var(--tbe-tq)]">TECNOLOGIA</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--tbe-text-2)]">
            Divisão de tecnologia do grupo TENKA. Sites, aplicativos, sistemas, integrações e
            produtos digitais em operação.
          </p>
        </div>

        <div>
          <h3 className="tbe-mono text-[10px] tracking-[0.3em] text-[var(--tbe-text-2)]">CONTATO</h3>
          <address className="mt-4 flex flex-col gap-2 text-sm not-italic text-[var(--tbe-text-2)]">
            <a href="mailto:contato@tenka.com.br" className="transition-colors hover:text-[var(--tbe-text)]">
              contato@tenka.com.br
            </a>
            <span>São Paulo — Brasil</span>
          </address>
        </div>

        <div>
          <h3 className="tbe-mono text-[10px] tracking-[0.3em] text-[var(--tbe-text-2)]">GRUPO TENKA</h3>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            <li>
              <Link to="/" className="text-[var(--tbe-text-2)] transition-colors hover:text-[var(--tbe-text)]">
                Página inicial
              </Link>
            </li>
            <li>
              <Link to="/games" className="text-[var(--tbe-text-2)] transition-colors hover:text-[var(--tbe-text)]">
                Tenka Games
              </Link>
            </li>
            <li>
              <Link to="/multimidia" className="text-[var(--tbe-text-2)] transition-colors hover:text-[var(--tbe-text)]">
                Tenka Multimídia
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="tbe-mono text-[10px] tracking-[0.3em] text-[var(--tbe-text-2)]">SISTEMA</h3>
          <p className="tbe-mono mt-4 text-[10px] leading-relaxed text-[var(--tbe-text-mute)]">
            TENKA BUILD ENGINE v1.0
            <br />
            STATUS: ONLINE
            <br />© {new Date().getFullYear()} TENKA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
