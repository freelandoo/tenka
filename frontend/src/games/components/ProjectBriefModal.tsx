import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react';

const PROJECT_TYPES = [
  'Jogo completo',
  'Protótipo',
  'Experiência WebGL',
  'Game para campanha',
  'Arte e narrativa',
  'Ainda estou definindo',
];

const STAGES = ['Só uma ideia', 'Conceito definido', 'Protótipo existente', 'Em produção'];
const PLATFORMS = ['PC', 'Consoles', 'Mobile', 'Web', 'VR / AR'];

const STEP_TITLES = ['Tipo de projeto', 'Estágio atual', 'Plataformas', 'Escopo', 'Contato'];

interface BriefData {
  projectType: string;
  stage: string;
  platforms: string[];
  scope: string;
  name: string;
  email: string;
  company: string;
}

const EMPTY_BRIEF: BriefData = {
  projectType: '',
  stage: '',
  platforms: [],
  scope: '',
  name: '',
  email: '',
  company: '',
};

export interface ProjectBriefModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Mission-briefing modal: five steps, keyboard navigable, focus-trapped.
 * Data persists across steps; there is no backend yet, so submission logs the
 * briefing and shows a success state.
 */
export function ProjectBriefModal({ open, onClose }: ProjectBriefModalProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BriefData>(EMPTY_BRIEF);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Reset transient state each time the modal opens; keep entered data so an
  // accidental close doesn't wipe the briefing.
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      setError(null);
      setSubmitted(false);
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        dialogRef.current
          ?.querySelector<HTMLElement>('button, [href], input, textarea, select')
          ?.focus();
      });
    } else {
      document.documentElement.style.overflow = '';
      previousFocus.current?.focus();
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  // Escape must close the modal even when focus fell back to the body (e.g.
  // right after a step's buttons unmount), so it lives on the document.
  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, onClose]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      // Focus trap: cycle within the dialog.
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, textarea, select',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  const validate = (current: number): string | null => {
    switch (current) {
      case 0:
        return data.projectType ? null : 'Selecione um tipo de projeto para continuar.';
      case 1:
        return data.stage ? null : 'Informe em que estágio o projeto está.';
      case 2:
        return data.platforms.length > 0 ? null : 'Selecione pelo menos uma plataforma.';
      case 3:
        return data.scope.trim().length >= 10
          ? null
          : 'Descreva o escopo em pelo menos uma frase (mínimo de 10 caracteres).';
      case 4: {
        if (data.name.trim().length < 2) return 'Informe seu nome.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Informe um e-mail válido.';
        return null;
      }
      default:
        return null;
    }
  };

  const next = () => {
    const validationError = validate(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (step < STEP_TITLES.length - 1) {
      setStep(step + 1);
    } else {
      // No backend yet: the briefing is logged for now.
      console.log('TENKA // NOVO BRIEFING DE PROJETO', data);
      setSubmitted(true);
      // The focused submit button unmounts — keep focus inside the dialog.
      requestAnimationFrame(() => {
        dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
      });
    }
  };

  const back = () => {
    setError(null);
    if (step > 0) setStep(step - 1);
  };

  const togglePlatform = (platform: string) => {
    setData((current) => ({
      ...current,
      platforms: current.platforms.includes(platform)
        ? current.platforms.filter((p) => p !== platform)
        : [...current.platforms, platform],
    }));
  };

  const optionButton = (selected: boolean) =>
    `wf-mono border px-4 py-3 text-left text-xs tracking-[0.15em] transition-colors ${
      selected
        ? 'border-[var(--wf-energy)] bg-[var(--wf-energy)]/10 text-[var(--wf-text)]'
        : 'border-white/15 text-[var(--wf-text-dim)] hover:border-white/40 hover:text-[var(--wf-text)]'
    }`;

  const fieldClass =
    'w-full border border-white/15 bg-[var(--wf-bg)] px-4 py-3 text-sm text-[var(--wf-text)] placeholder:text-[var(--wf-text-dim)]/60 focus:border-[var(--wf-energy)] focus:outline-none';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="brief-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="wf-scanlines relative w-full max-w-xl border border-white/15 bg-[var(--wf-bg-elev)] p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="wf-mono text-[10px] tracking-[0.35em] text-[var(--wf-energy)]">
                  NOVO PROJETO <span className="text-[var(--wf-text-dim)]">//</span> BRIEFING
                </p>
                <h2 id="brief-title" className="wf-display mt-2 text-xl font-bold">
                  {submitted ? 'Transmissão recebida' : STEP_TITLES[step]}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar formulário"
                className="p-1 text-[var(--wf-text-dim)] transition-colors hover:text-[var(--wf-text)]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {!submitted && (
              <div className="mt-6" aria-hidden="true">
                <div className="h-px w-full bg-white/10">
                  <div
                    className="h-px bg-[var(--wf-energy)] transition-all duration-300"
                    style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
                  />
                </div>
                <p className="wf-mono mt-2 text-[9px] tracking-[0.3em] text-[var(--wf-text-dim)]">
                  PASSO {step + 1} / {STEP_TITLES.length}
                </p>
              </div>
            )}

            <div className="mt-6 min-h-[260px]">
              {submitted ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--wf-ok)] text-[var(--wf-ok)]">
                    <Check size={22} aria-hidden="true" />
                  </span>
                  <p className="wf-mono text-[10px] tracking-[0.3em] text-[var(--wf-ok)]">
                    STATUS: RECEBIDO
                  </p>
                  <p className="max-w-sm text-sm leading-relaxed text-[var(--wf-text-dim)]">
                    Seu briefing entrou na fila do núcleo. A Tenka responde em até dois dias úteis
                    no e-mail informado.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="wf-mono mt-4 border border-white/20 px-6 py-3 text-[11px] tracking-[0.25em] text-[var(--wf-text)] transition-colors hover:border-[var(--wf-energy)]"
                  >
                    FECHAR
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.fieldset
                    key={step}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.22 }}
                    className="border-0 p-0"
                  >
                    <legend className="sr-only">{STEP_TITLES[step]}</legend>

                    {step === 0 && (
                      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de projeto">
                        {PROJECT_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            role="radio"
                            aria-checked={data.projectType === type}
                            onClick={() => setData({ ...data, projectType: type })}
                            className={optionButton(data.projectType === type)}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}

                    {step === 1 && (
                      <div className="grid gap-2" role="radiogroup" aria-label="Estágio atual">
                        {STAGES.map((stage) => (
                          <button
                            key={stage}
                            type="button"
                            role="radio"
                            aria-checked={data.stage === stage}
                            onClick={() => setData({ ...data, stage })}
                            className={optionButton(data.stage === stage)}
                          >
                            {stage}
                          </button>
                        ))}
                      </div>
                    )}

                    {step === 2 && (
                      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Plataformas">
                        {PLATFORMS.map((platform) => (
                          <button
                            key={platform}
                            type="button"
                            role="checkbox"
                            aria-checked={data.platforms.includes(platform)}
                            onClick={() => togglePlatform(platform)}
                            className={optionButton(data.platforms.includes(platform))}
                          >
                            {platform}
                          </button>
                        ))}
                      </div>
                    )}

                    {step === 3 && (
                      <div>
                        <label htmlFor="brief-scope" className="mb-2 block text-sm text-[var(--wf-text-dim)]">
                          Descreva o que você quer construir — mecânica, referência, objetivo.
                        </label>
                        <textarea
                          id="brief-scope"
                          rows={6}
                          value={data.scope}
                          onChange={(event) => setData({ ...data, scope: event.target.value })}
                          className={fieldClass}
                          placeholder="Ex.: um jogo de exploração 2D para PC, com foco em narrativa ambiental…"
                        />
                      </div>
                    )}

                    {step === 4 && (
                      <div className="grid gap-4">
                        <div>
                          <label htmlFor="brief-name" className="mb-1 block text-sm text-[var(--wf-text-dim)]">
                            Nome *
                          </label>
                          <input
                            id="brief-name"
                            type="text"
                            autoComplete="name"
                            value={data.name}
                            onChange={(event) => setData({ ...data, name: event.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label htmlFor="brief-email" className="mb-1 block text-sm text-[var(--wf-text-dim)]">
                            E-mail *
                          </label>
                          <input
                            id="brief-email"
                            type="email"
                            autoComplete="email"
                            value={data.email}
                            onChange={(event) => setData({ ...data, email: event.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label htmlFor="brief-company" className="mb-1 block text-sm text-[var(--wf-text-dim)]">
                            Empresa ou estúdio (opcional)
                          </label>
                          <input
                            id="brief-company"
                            type="text"
                            autoComplete="organization"
                            value={data.company}
                            onChange={(event) => setData({ ...data, company: event.target.value })}
                            className={fieldClass}
                          />
                        </div>
                      </div>
                    )}
                  </motion.fieldset>
                </AnimatePresence>
              )}
            </div>

            {!submitted && (
              <>
                {error && (
                  <p role="alert" className="wf-mono mt-4 text-[11px] tracking-wide text-[var(--wf-energy-2)]">
                    ⚠ {error}
                  </p>
                )}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={back}
                    disabled={step === 0}
                    className="wf-mono flex items-center gap-2 border border-white/15 px-5 py-3 text-[11px] tracking-[0.25em] text-[var(--wf-text-dim)] transition-colors enabled:hover:border-white/40 enabled:hover:text-[var(--wf-text)] disabled:opacity-30"
                  >
                    <ArrowLeft size={14} aria-hidden="true" /> VOLTAR
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="wf-cta wf-mono flex items-center gap-2 border border-[var(--wf-energy)] px-6 py-3 text-[11px] tracking-[0.25em] text-[var(--wf-text)]"
                  >
                    {step === STEP_TITLES.length - 1 ? 'TRANSMITIR' : 'AVANÇAR'}
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
