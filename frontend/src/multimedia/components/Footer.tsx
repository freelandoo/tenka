import { Link } from 'react-router-dom';

export function Footer() {
  return <footer className="relative border-t-2 border-[var(--mmx-border)] bg-[var(--mmx-black)] py-14">
    <div className="mx-auto grid max-w-7xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr] lg:px-10">
      <div><p className="mmx-display text-3xl">TENKA <span className="text-[var(--mmx-red)]">MULTIMÍDIA</span></p><p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--mmx-text-2)]">Conteúdo, campanhas, audiovisual e entretenimento para marcas que querem participar da cultura.</p></div>
      <div><p className="mmx-mono text-[9px] tracking-[0.3em] text-[var(--mmx-red)]">CONTATO</p><a href="mailto:contato@tenka.com.br" className="mt-4 block text-sm text-[var(--mmx-text-2)]">contato@tenka.com.br</a><p className="mt-2 text-sm text-[var(--mmx-text-mute)]">São Paulo — Brasil</p></div>
      <div><p className="mmx-mono text-[9px] tracking-[0.3em] text-[var(--mmx-red)]">GRUPO TENKA</p><nav className="mt-4 flex flex-col gap-2 text-sm text-[var(--mmx-text-2)]" aria-label="Divisões Tenka"><Link to="/">Início</Link><Link to="/games">Games</Link><Link to="/desenvolvimento">Tecnologia</Link></nav></div>
    </div>
    <div className="mx-auto mt-12 flex max-w-7xl flex-wrap justify-between gap-3 border-t border-white/10 px-6 pt-5 lg:px-10"><p className="mmx-mono text-[9px] tracking-[0.22em] text-[var(--mmx-text-mute)]">CONTENT STAGE // SIGNAL ACTIVE</p><p className="mmx-mono text-[9px] tracking-[0.22em] text-[var(--mmx-text-mute)]">© {new Date().getFullYear()} TENKA</p></div>
  </footer>;
}
