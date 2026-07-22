import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Menu, Volume2, VolumeX, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MMX_SECTIONS } from '../data/campaign';
import { useStage } from '../state/StageContext';

const LINKS = [
  ['SOCIAL', MMX_SECTIONS.services], ['PROJETOS', MMX_SECTIONS.portfolio], ['FORMATOS', MMX_SECTIONS.formats],
  ['CAMPANHAS', MMX_SECTIONS.builder], ['ENTRETENIMENTO', MMX_SECTIONS.entertainment], ['LAB', MMX_SECTIONS.lab],
] as const;

export function Navigation({ onNavigate, onOpenBrief }: { onNavigate: (id: string) => void; onOpenBrief: () => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>(MMX_SECTIONS.hero);
  const { soundEnabled, toggleSound } = useStage();

  useEffect(() => {
    const nodes = Object.values(MMX_SECTIONS).map((id) => document.getElementById(id)).filter((node): node is HTMLElement => Boolean(node));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-30% 0px -58% 0px', threshold: [0, 0.2, 0.5] });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => { document.documentElement.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [open]);

  const navigate = (id: string) => { setOpen(false); onNavigate(id); };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[rgba(5,2,3,0.86)] backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:px-10" aria-label="Navegação Multimídia">
          <div className="flex items-center gap-4">
            <Link to="/" className="mmx-mono flex min-h-[40px] items-center gap-2 border border-white/20 px-3 text-[9px] tracking-[0.2em] text-[var(--mmx-text-2)]"><ArrowLeft size={13} aria-hidden="true" /> VOLTAR</Link>
            <button type="button" onClick={() => navigate(MMX_SECTIONS.hero)} className="mmx-display text-xl">TENKA <span className="text-[var(--mmx-red)]">MULTIMÍDIA</span></button>
          </div>
          <div className="hidden items-center gap-5 xl:flex">
            {LINKS.map(([label, id]) => <button key={id} type="button" className="mmx-nav-link" data-active={active === id} onClick={() => navigate(id)}>{label}</button>)}
            <button type="button" onClick={toggleSound} className="p-2 text-[var(--mmx-text-2)]" aria-label={soundEnabled ? 'Desativar som' : 'Ativar som'}>{soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
            <button type="button" className="mmx-btn mmx-btn-primary !min-h-[40px] !px-4 !py-2" onClick={onOpenBrief}>COMEÇAR PROJETO</button>
          </div>
          <button type="button" className="p-2 xl:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}><Menu size={24} /></button>
        </nav>
      </header>

      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-[var(--mmx-black)]" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-16 items-center justify-between px-6"><span className="mmx-mono text-[10px] tracking-[0.3em] text-[var(--mmx-red)]">TENKA // PROGRAMAÇÃO</span><button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="p-2"><X size={24} /></button></div>
          <nav className="flex flex-1 flex-col justify-center px-8" aria-label="Menu móvel">
            {LINKS.map(([label, id], index) => <motion.button key={id} type="button" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.045 }} onClick={() => navigate(id)} className="mmx-display border-b border-white/10 py-3 text-left text-[clamp(2rem,9vw,4rem)]"><span className="mmx-mono mr-4 text-[10px] text-[var(--mmx-red)]">{String(index + 1).padStart(2, '0')}</span>{label}</motion.button>)}
            <button type="button" className="mmx-btn mmx-btn-primary mt-8 self-start" onClick={() => { setOpen(false); onOpenBrief(); }}>COMEÇAR PROJETO</button>
          </nav>
        </motion.div>}
      </AnimatePresence>
    </>
  );
}
