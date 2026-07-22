import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Send, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStage } from '../state/StageContext';

const schema = z.object({
  name: z.string().min(2, 'Informe seu nome.'),
  email: z.string().email('Informe um e-mail válido.'),
  company: z.string().optional(),
  idea: z.string().min(12, 'Conte um pouco mais sobre a ideia.'),
});
type FormData = z.infer<typeof schema>;

export function BriefModal() {
  const { briefOpen, closeBrief, briefHasConfiguration, campaign } = useStage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!briefOpen) return;
    previousFocus.current = document.activeElement as HTMLElement;
    setSent(false);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('button, input, textarea')?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeBrief();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea'));
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.documentElement.style.overflow = previousOverflow; window.removeEventListener('keydown', onKey); previousFocus.current?.focus(); };
  }, [briefOpen, closeBrief]);

  const submit = async (_data: FormData) => {
    await Promise.resolve();
    setSent(true);
    reset();
  };

  const campaignSummary = [campaign.objective, campaign.formats.join(' + '), campaign.energy, campaign.platforms.join(' + ')].filter(Boolean).join(' // ');

  return <AnimatePresence>{briefOpen && (
    <motion.div className="mmx-modal-backdrop flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeBrief(); }}>
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="mmx-brief-title" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto border-2 border-[var(--mmx-red)] bg-[var(--mmx-bg)] p-6 sm:p-9">
        <button type="button" onClick={closeBrief} className="absolute right-4 top-4 p-2" aria-label="Fechar briefing"><X size={22} /></button>
        {sent ? <div className="flex min-h-72 flex-col items-center justify-center text-center"><span className="flex h-14 w-14 items-center justify-center border-2 border-[var(--mmx-yellow)] text-[var(--mmx-yellow)]"><Check size={28} /></span><h2 id="mmx-brief-title" className="mmx-display mt-6 text-4xl">IDEIA RECEBIDA.</h2><p className="mt-3 max-w-md text-[var(--mmx-text-2)]">O briefing entrou na nossa pauta. A equipe Tenka retornará para organizar os próximos passos.</p><button type="button" className="mmx-btn mmx-btn-primary mt-7" onClick={closeBrief}>FECHAR</button></div> : <>
          <p className="mmx-mono text-[10px] tracking-[0.35em] text-[var(--mmx-red)]">NOVO PROJETO // BRIEFING</p>
          <h2 id="mmx-brief-title" className="mmx-display mt-3 text-[clamp(2.2rem,6vw,4.6rem)]">COLOQUE SUA<br />IDEIA NA PAUTA.</h2>
          {briefHasConfiguration && campaignSummary && <div className="mt-6 border-l-4 border-[var(--mmx-yellow)] bg-[var(--mmx-yellow)]/[0.06] p-4"><p className="mmx-mono text-[9px] tracking-[0.25em] text-[var(--mmx-yellow)]">CONFIGURAÇÃO IMPORTADA</p><p className="mt-2 text-sm text-[var(--mmx-text-2)]">{campaignSummary}</p></div>}
          <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit(submit)} noValidate>
            <Field label="NOME *" error={errors.name?.message}><input className="mmx-field" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register('name')} /></Field>
            <Field label="E-MAIL *" error={errors.email?.message}><input className="mmx-field" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register('email')} /></Field>
            <Field label="EMPRESA"><input className="mmx-field" autoComplete="organization" {...register('company')} /></Field>
            <div className="hidden sm:block" />
            <Field label="QUAL É A IDEIA? *" error={errors.idea?.message} full><textarea className="mmx-field min-h-32 resize-y" aria-invalid={Boolean(errors.idea)} {...register('idea')} /></Field>
            <button type="submit" disabled={isSubmitting} className="mmx-btn mmx-btn-primary sm:col-span-2 sm:justify-center disabled:opacity-50">{isSubmitting ? 'ENVIANDO...' : 'ENVIAR BRIEFING'} <Send size={16} /></button>
          </form>
        </>}
      </motion.div>
    </motion.div>
  )}</AnimatePresence>;
}

function Field({ label, error, full, children }: { label: string; error?: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`grid gap-2 ${full ? 'sm:col-span-2' : ''}`}><span className="mmx-cond text-sm tracking-[0.12em]">{label}</span>{children}{error && <span role="alert" className="text-xs text-[var(--mmx-coral)]">{error}</span>}</label>;
}
