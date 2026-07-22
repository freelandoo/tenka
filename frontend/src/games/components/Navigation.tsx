import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Menu, X, Volume2, VolumeX } from 'lucide-react';
import { PHASE_LABELS, SECTION_IDS, type WorldForgePhase } from '../lib/constants';
import { scrollToSection } from '../lib/scrollBus';

const NAV_LINKS = [
  { label: 'MUNDOS', target: SECTION_IDS.worlds },
  { label: 'O QUE FAZEMOS', target: SECTION_IDS.capabilities },
  { label: 'PROCESSO', target: SECTION_IDS.pipeline },
  { label: 'LAB', target: SECTION_IDS.lab },
  { label: 'ARSENAL', target: SECTION_IDS.arsenal },
  { label: 'CONTATO', target: SECTION_IDS.contact },
];

export interface NavigationProps {
  phase: WorldForgePhase;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenBrief: () => void;
}

export function Navigation({ phase, soundOn, onToggleSound, onOpenBrief }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<string>(SECTION_IDS.hero);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.6);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current && max > 0) {
        progressRef.current.style.transform = `scaleX(${Math.min(window.scrollY / max, 1)})`;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy: mark the section nearest the top third of the viewport active.
  useEffect(() => {
    const ids = Object.values(SECTION_IDS);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Full-screen menu behaves like a pause screen: lock scroll, close on Esc.
  useEffect(() => {
    if (!menuOpen) return;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const navigate = (target: string) => {
    setMenuOpen(false);
    scrollToSection(target);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-500 ${
          scrolled
            ? 'border-white/10 bg-[#050505]/90 backdrop-blur-md'
            : 'border-transparent bg-gradient-to-b from-black/40 to-transparent'
        }`}
      >
        {/* Page progress */}
        <div
          ref={progressRef}
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px] origin-left bg-[var(--wf-energy)]"
          style={{ transform: 'scaleX(0)' }}
        />

        <nav
          className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:px-10"
          aria-label="Navegação principal"
        >
          <div className="flex items-center gap-3">
            <Link
              to="/"
              data-cursor="ABRIR"
              aria-label="Voltar para a página inicial da TENKA"
              className="wf-mono flex items-center gap-2 border border-white/15 px-3 py-2 text-[11px] tracking-[0.2em] text-[var(--wf-text-dim)] transition-colors hover:border-[var(--wf-energy)] hover:text-[var(--wf-text)]"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              <span className="hidden sm:inline">VOLTAR</span>
            </Link>
            <Link to="/" className="wf-display text-sm font-bold tracking-wide" data-cursor="ABRIR">
              TENKA<span className="text-[var(--wf-energy)]">//</span>GAMES
            </Link>
          </div>

          <div className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = active === link.target;
              return (
                <button
                  key={link.target}
                  type="button"
                  data-cursor="ABRIR"
                  onClick={() => navigate(link.target)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`wf-mono relative py-1 text-[12px] tracking-[0.18em] transition-colors ${
                    isActive
                      ? 'text-[var(--wf-text)]'
                      : 'text-[var(--wf-text-dim)] hover:text-[var(--wf-text)]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute -bottom-0.5 left-0 h-[2px] w-full bg-[var(--wf-energy)]"
                    />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundOn ? 'Desativar som da interface' : 'Ativar som da interface'}
              aria-pressed={soundOn}
              className="text-[var(--wf-text-dim)] transition-colors hover:text-[var(--wf-text)]"
            >
              {soundOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
            </button>
            <button
              type="button"
              data-cursor="ATIVAR"
              onClick={onOpenBrief}
              className="wf-cta wf-mono border border-[var(--wf-energy)] px-4 py-2 text-[11px] tracking-[0.2em] text-[var(--wf-text)]"
            >
              INICIAR PROJETO
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            className="p-2 text-[var(--wf-text)] lg:hidden"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </nav>
      </header>

      {/* Mobile: full-screen pause-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="wf-scanlines fixed inset-0 z-50 flex flex-col bg-[#050505]/98"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <p className="wf-mono text-[11px] tracking-[0.4em] text-[var(--wf-energy)]">
                TENKA <span className="text-[var(--wf-text-dim)]">//</span> PAUSA
              </p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
                className="p-2 text-[var(--wf-text)]"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col justify-center gap-1 px-8" aria-label="Menu móvel">
              <motion.div
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="wf-mono flex items-center gap-3 py-4 text-xs tracking-[0.3em] text-[var(--wf-text-dim)]"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  VOLTAR PARA A TENKA
                </Link>
              </motion.div>
              {NAV_LINKS.map((link, index) => {
                const isActive = active === link.target;
                return (
                  <motion.button
                    key={link.target}
                    type="button"
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index, duration: 0.3 }}
                    onClick={() => navigate(link.target)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`wf-display flex items-baseline gap-4 py-3 text-left text-3xl font-bold transition-colors ${
                      isActive ? 'text-[var(--wf-energy)]' : 'text-[var(--wf-text)]'
                    }`}
                  >
                    <span className="wf-mono text-xs text-[var(--wf-text-dim)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {link.label}
                  </motion.button>
                );
              })}
              <motion.button
                type="button"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * NAV_LINKS.length, duration: 0.3 }}
                onClick={() => {
                  setMenuOpen(false);
                  onOpenBrief();
                }}
                className="wf-cta wf-mono mt-6 self-start border border-[var(--wf-energy)] px-6 py-4 text-xs tracking-[0.25em] text-[var(--wf-text)]"
              >
                INICIAR UM PROJETO
              </motion.button>
            </nav>

            <div className="flex items-center justify-between px-8 pb-10">
              <button
                type="button"
                onClick={onToggleSound}
                aria-pressed={soundOn}
                className="wf-mono flex items-center gap-2 text-[10px] tracking-[0.3em] text-[var(--wf-text-dim)]"
              >
                {soundOn ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
                SOM {soundOn ? 'ATIVO' : 'MUDO'}
              </button>
              <p className="wf-mono text-[10px] tracking-[0.3em] text-[var(--wf-text-dim)]">
                FASE // {PHASE_LABELS[phase]}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
