import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { setCanvasMode } from '../state/engine';

// TODO: trocar pelo número real de WhatsApp da Tenka Dev (formato E.164, só dígitos).
const WHATSAPP_NUMBER = '5511000000000';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Quero começar um projeto com a Tenka Dev.')}`;

export function FinalDeploySection({ reducedMotion, onOpenBrief }: { reducedMotion: boolean; onOpenBrief: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  useGSAP(() => {
    ScrollTrigger.create({ trigger: sectionRef.current, start: 'top 65%', onEnter: () => setCanvasMode('online', 1.4) });
    gsap.from('.tbe-deploy-reveal', { autoAlpha: 0, y: reducedMotion ? 0 : 35, stagger: reducedMotion ? 0 : 0.1, duration: reducedMotion ? 0.1 : 0.75, ease: 'power3.out', scrollTrigger: { trigger: sectionRef.current, start: 'top 74%' } });
    gsap.fromTo('.tbe-final-cta', { autoAlpha: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 16 }, { autoAlpha: 1, y: 0, ease: 'power3.out', scrollTrigger: { trigger: sectionRef.current, start: '70% 70%', end: 'bottom 80%', scrub: reducedMotion ? false : 0.5 } });
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  return (
    <section id={TBE_SECTIONS.deploy} ref={sectionRef} className="relative flex min-h-[88dvh] items-center overflow-hidden py-28" aria-label="Iniciar um projeto">
      <div className="tbe-blueprint absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-7xl px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.55fr] lg:items-end">
          <div><p className="tbe-deploy-reveal tbe-mono mb-5 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">DEPLOY SUCCESSFUL // SYSTEM ONLINE</p><h2 className="tbe-deploy-reveal tbe-display text-[clamp(2.6rem,7vw,5.8rem)] font-bold leading-[0.96]">A PRÓXIMA<br />VERSÃO COMEÇA AGORA.</h2><p className="tbe-deploy-reveal mt-7 max-w-xl text-[17px] leading-relaxed text-[var(--tbe-text)]/75">Conte o problema, o contexto e o estágio atual. A primeira resposta organiza o caminho — antes de falar em ferramentas.</p></div>
          <div className="tbe-final-cta border-l border-[var(--tbe-tq)]/40 pl-6"><p className="tbe-mono text-[10px] leading-7 tracking-[0.2em] text-[var(--tbe-text-mute)]">ENVIRONMENT&nbsp;&nbsp;PRODUCTION<br />STATUS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ONLINE<br />NEXT ACTION&nbsp;&nbsp;&nbsp;NEW PROJECT</p><button type="button" onClick={onOpenBrief} onMouseEnter={() => window.dispatchEvent(new CustomEvent('tenka-cta-focus'))} onFocus={() => window.dispatchEvent(new CustomEvent('tenka-cta-focus'))} data-cursor="CONSTRUIR" className="tbe-cta tbe-mono mt-8 min-h-[52px] w-full border border-[var(--tbe-tq)] px-7 py-4 text-xs tracking-[0.24em] text-[var(--tbe-text)] active:translate-y-px">COMEÇAR MEU PROJETO</button><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" data-cursor="ABRIR" className="tbe-mono mt-3 flex min-h-[48px] items-center justify-center gap-2 border border-[#0b1b33]/15 px-7 py-3 text-xs tracking-[0.24em] text-[var(--tbe-text-2)] transition-colors hover:border-[var(--tbe-tq)] hover:text-[var(--tbe-text)]"><span className="tbe-status-dot" aria-hidden="true" />FALAR NO WHATSAPP AGORA</a><p className="mt-4 text-xs text-[var(--tbe-text-mute)]">Leva cerca de 3 minutos.</p></div>
        </div>
      </div>
    </section>
  );
}
