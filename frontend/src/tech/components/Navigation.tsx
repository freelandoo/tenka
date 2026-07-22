import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { TBE_SECTIONS } from '../lib/constants';
import { ScrollTrigger } from '../lib/gsap';

const NAV_LINKS = [
  { label: 'PRODUTOS', target: TBE_SECTIONS.portfolio },
  { label: 'SOLUÇÕES', target: TBE_SECTIONS.modules },
  { label: 'CONSTRUIR', target: TBE_SECTIONS.builder },
  { label: 'PROCESSO', target: TBE_SECTIONS.pipeline },
  { label: 'TECNOLOGIA', target: TBE_SECTIONS.technology },
  { label: 'LAB', target: TBE_SECTIONS.lab },
  { label: 'CONTATO', target: TBE_SECTIONS.deploy },
];

export interface NavigationProps {
  onNavigate: (target: string) => void;
  onOpenBrief: () => void;
}

export function Navigation({ onNavigate, onOpenBrief }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<string>(TBE_SECTIONS.hero);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chromeTrigger = ScrollTrigger.create({
      start: () => window.innerHeight * 0.5,
      onEnter: () => setScrolled(true),
      onLeaveBack: () => setScrolled(false),
    });
    const progressTrigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${self.progress})`;
      },
    });
    return () => {
      chromeTrigger.kill();
      progressTrigger.kill();
    };
  }, []);

  // Scroll-spy for the active section indicator.
  useEffect(() => {
    const sections = Object.values(TBE_SECTIONS)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
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

  // Pause-style full-screen menu: lock scroll, close on Escape.
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
    onNavigate(target);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-500 ${
          scrolled
            ? 'border-white/10 bg-[#020708]/90 backdrop-blur-md'
            : 'border-transparent bg-gradient-to-b from-black/40 to-transparent'
        }`}
      >
        <div
          ref={progressRef}
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px] origin-left bg-[var(--tbe-tq)]"
          style={{ transform: 'scaleX(0)' }}
        />

        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:px-10" aria-label="Navegação principal">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              data-cursor="ABRIR"
              aria-label="Voltar para a página inicial da TENKA"
              className="tbe-mono flex items-center gap-2 border border-white/15 px-3 py-2 text-[11px] tracking-[0.2em] text-[var(--tbe-text-2)] transition-colors hover:border-[var(--tbe-tq)] hover:text-[var(--tbe-text)]"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              <span className="hidden sm:inline">VOLTAR</span>
            </Link>
            <Link to="/" className="tbe-display flex items-baseline gap-2 text-sm font-bold tracking-wide" data-cursor="ABRIR">
              TENKA
              <span className="tbe-mono text-[9px] font-normal tracking-[0.3em] text-[var(--tbe-tq)]">TECNOLOGIA</span>
            </Link>
          </div>

          <div className="hidden items-center gap-6 xl:flex">
            {NAV_LINKS.map((link) => {
              const isActive = active === link.target;
              return (
                <button
                  key={link.target}
                  type="button"
                  data-cursor="ABRIR"
                  onClick={() => navigate(link.target)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`tbe-mono relative py-1 text-[12px] tracking-[0.16em] transition-colors ${
                    isActive ? 'text-[var(--tbe-text)]' : 'text-[var(--tbe-text-2)] hover:text-[var(--tbe-text)]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.span layoutId="tbe-nav-active" className="absolute -bottom-0.5 left-0 h-[2px] w-full bg-[var(--tbe-tq)]" />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              data-cursor="CONSTRUIR"
              onClick={onOpenBrief}
              className="tbe-cta tbe-mono border border-[var(--tbe-tq)] px-4 py-2 text-[11px] tracking-[0.2em] text-[var(--tbe-text)]"
            >
              INICIAR PROJETO
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            className="p-2 text-[var(--tbe-text)] xl:hidden"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </nav>
      </header>

      {/* Full-screen system menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="tbe-blueprint fixed inset-0 z-50 flex flex-col bg-[#020708]/98"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <p className="tbe-mono text-[11px] tracking-[0.4em] text-[var(--tbe-tq)]">
                TENKA <span className="text-[var(--tbe-text-mute)]">//</span> SISTEMA
              </p>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="p-2 text-[var(--tbe-text)]">
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col justify-center gap-1 overflow-y-auto px-8" aria-label="Menu móvel">
              <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <Link to="/" onClick={() => setMenuOpen(false)} className="tbe-mono flex items-center gap-3 py-4 text-xs tracking-[0.3em] text-[var(--tbe-text-2)]">
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
                    transition={{ delay: 0.04 * index, duration: 0.3 }}
                    onClick={() => navigate(link.target)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`tbe-display flex items-baseline gap-4 py-3 text-left text-3xl font-bold transition-colors ${
                      isActive ? 'text-[var(--tbe-tq)]' : 'text-[var(--tbe-text)]'
                    }`}
                  >
                    <span className="tbe-mono text-xs font-normal text-[var(--tbe-text-mute)]">{String(index + 1).padStart(2, '0')}</span>
                    {link.label}
                  </motion.button>
                );
              })}
              <motion.button
                type="button"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * NAV_LINKS.length, duration: 0.3 }}
                onClick={() => {
                  setMenuOpen(false);
                  onOpenBrief();
                }}
                className="tbe-cta tbe-mono mt-6 self-start border border-[var(--tbe-tq)] px-6 py-4 text-xs tracking-[0.25em] text-[var(--tbe-text)]"
              >
                INICIAR UM PROJETO
              </motion.button>
            </nav>

            <div className="flex items-center justify-between px-8 pb-8">
              <p className="tbe-mono flex items-center gap-2 text-[10px] tracking-[0.3em] text-[var(--tbe-text-mute)]">
                <span className="tbe-status-dot" /> SISTEMA ONLINE
              </p>
              <p className="tbe-mono text-[10px] tracking-[0.3em] text-[var(--tbe-text-mute)]">BUILD ENGINE v1.0</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
