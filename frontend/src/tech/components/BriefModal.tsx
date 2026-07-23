import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { BUILDER_MODULES } from '../data/modules';
import { useBuildEngine } from '../state/BuildEngineContext';

const PRODUCT_TYPES = ['Site', 'Aplicativo', 'Sistema', 'Plataforma SaaS', 'Automação', 'Ainda estou definindo'];
const PLATFORMS = ['Web', 'Android', 'iOS', 'Desktop', 'Painel administrativo', 'Múltiplas plataformas'];
const STAGES = [
  'Apenas uma ideia',
  'Tenho referências',
  'Tenho um protótipo',
  'O produto já existe',
  'Preciso substituir um sistema',
  'Preciso ampliar uma plataforma',
];

const STEP_TITLES = ['Tipo de produto', 'Problema', 'Funcionalidades', 'Plataformas', 'Estágio atual', 'Contato'];

const contactSchema = z.object({
  name: z.string().min(2, 'Informe seu nome.'),
  company: z.string().optional(),
  email: z.string().email('Informe um e-mail válido.'),
  phone: z.string().optional(),
  message: z.string().optional(),
});

type ContactData = z.infer<typeof contactSchema>;

/**
 * NEW PROJECT // BUILD BRIEFING — six-step accessible modal. Focus-trapped,
 * Escape closes, data persists across steps, and the configuration assembled
 * in the "Build your product" section arrives prefilled.
 */
const ENGINE_TYPE_LABEL: Record<string, string> = {
  site: 'Site',
  app: 'Aplicativo',
  system: 'Sistema',
};

export function BriefModal() {
  const { briefOpen, closeBrief, builderModules, briefHasConfiguration, productType: engineType } = useBuildEngine();
  const [step, setStep] = useState(0);
  const [productType, setProductType] = useState('');
  const [problem, setProblem] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactData>({ resolver: zodResolver(contactSchema) });

  // Prefill the builder configuration each time the modal opens with one, and
  // the product type selected in the hero unless the visitor already chose one.
  useEffect(() => {
    if (!briefOpen) return;
    if (briefHasConfiguration) {
      setFeatures(builderModules);
      setStep(0);
    }
    setProductType((current) => current || ENGINE_TYPE_LABEL[engineType] || '');
  }, [briefOpen, briefHasConfiguration, builderModules, engineType]);

  useEffect(() => {
    if (briefOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      setError(null);
      setSubmitted(false);
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        dialogRef.current?.querySelector<HTMLElement>('button, [href], input, textarea, select')?.focus();
      });
    } else {
      document.documentElement.style.overflow = '';
      previousFocus.current?.focus();
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [briefOpen]);

  useEffect(() => {
    if (!briefOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeBrief();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [briefOpen, closeBrief]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;
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
  }, []);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const validateStep = (current: number): string | null => {
    switch (current) {
      case 0:
        return productType ? null : 'Selecione um tipo de produto para continuar.';
      case 1:
        return problem.trim().length >= 10 ? null : 'Descreva o problema em pelo menos uma frase.';
      case 3:
        return platforms.length > 0 ? null : 'Selecione pelo menos uma plataforma.';
      case 4:
        return stage ? null : 'Informe em que estágio o projeto está.';
      default:
        return null;
    }
  };

  const next = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (step < STEP_TITLES.length - 1) setStep(step + 1);
  };

  const back = () => {
    setError(null);
    if (step > 0) setStep(step - 1);
  };

  const onSubmit = (contact: ContactData) => {
    // No backend yet — the briefing is logged as structured data.
    console.log('TENKA // NOVO BUILD BRIEFING', {
      productType,
      problem,
      features,
      platforms,
      stage,
      contact,
    });
    setSubmitted(true);
    requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    });
  };

  const optionButton = (selected: boolean) =>
    `tbe-mono border px-4 py-3 text-left text-xs tracking-[0.12em] transition-colors ${
      selected
        ? 'border-[var(--tbe-tq)] bg-[var(--tbe-tq)]/10 text-[var(--tbe-text)]'
        : 'border-[#0b1b33]/15 text-[var(--tbe-text-2)] hover:border-[#0b1b33]/40 hover:text-[var(--tbe-text)]'
    }`;

  const fieldClass =
    'w-full border border-[#0b1b33]/15 bg-[var(--tbe-bg)] px-4 py-3 text-sm text-[var(--tbe-text)] placeholder:text-[var(--tbe-text-mute)] focus:border-[var(--tbe-tq)] focus:outline-none';

  return (
    <AnimatePresence>
      {briefOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b1b33]/45 p-4 backdrop-blur-sm"
          onClick={closeBrief}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tbe-brief-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="tbe-blueprint relative max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[#0b1b33]/15 bg-[var(--tbe-bg-elev)] p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="tbe-mono text-[10px] tracking-[0.3em] text-[var(--tbe-tq)]">
                  NEW PROJECT <span className="text-[var(--tbe-text-mute)]">//</span> BUILD BRIEFING
                </p>
                <h2 id="tbe-brief-title" className="tbe-display mt-2 text-xl font-bold">
                  {submitted ? 'Briefing recebido' : STEP_TITLES[step]}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeBrief}
                aria-label="Fechar formulário"
                className="p-1 text-[var(--tbe-text-2)] transition-colors hover:text-[var(--tbe-text)]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {!submitted && (
              <div className="mt-5" aria-hidden="true">
                <div className="h-px w-full bg-[#0b1b33]/10">
                  <div
                    className="h-px bg-[var(--tbe-tq)] transition-all duration-300"
                    style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
                  />
                </div>
                <p className="tbe-mono mt-2 text-[9px] tracking-[0.3em] text-[var(--tbe-text-mute)]">
                  PASSO {step + 1} / {STEP_TITLES.length}
                </p>
              </div>
            )}

            <div className="mt-6 min-h-[280px]">
              {submitted ? (
                <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center border border-[var(--tbe-success)] text-[var(--tbe-success)]">
                    <Check size={22} aria-hidden="true" />
                  </span>
                  <p className="tbe-mono text-[10px] tracking-[0.3em] text-[var(--tbe-success)]">BRIEFING RECEBIDO</p>
                  <p className="max-w-md text-[15px] leading-relaxed text-[var(--tbe-text-2)]">
                    A estrutura inicial do seu projeto foi registrada. A Tenka poderá continuar a
                    partir destas informações.
                  </p>
                  <button
                    type="button"
                    onClick={closeBrief}
                    className="tbe-mono mt-4 border border-[#0b1b33]/20 px-6 py-3 text-[11px] tracking-[0.25em] text-[var(--tbe-text)] transition-colors hover:border-[var(--tbe-tq)]"
                  >
                    FECHAR
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.fieldset
                    key={step}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.2 }}
                    className="border-0 p-0"
                  >
                    <legend className="sr-only">{STEP_TITLES[step]}</legend>

                    {step === 0 && (
                      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de produto">
                        {PRODUCT_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            role="radio"
                            aria-checked={productType === type}
                            onClick={() => setProductType(type)}
                            className={optionButton(productType === type)}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}

                    {step === 1 && (
                      <div>
                        <label htmlFor="tbe-problem" className="mb-2 block text-sm text-[var(--tbe-text-2)]">
                          Qual problema este produto precisa resolver?
                        </label>
                        <textarea
                          id="tbe-problem"
                          rows={6}
                          value={problem}
                          onChange={(event) => setProblem(event.target.value)}
                          className={fieldClass}
                          placeholder="Ex.: nossa equipe perde horas controlando agendamentos por planilha e WhatsApp…"
                        />
                      </div>
                    )}

                    {step === 2 && (
                      <div>
                        {briefHasConfiguration && features.length > 0 && (
                          <p className="tbe-mono mb-3 text-[10px] tracking-[0.2em] text-[var(--tbe-tq)]">
                            CONFIGURAÇÃO IMPORTADA DO CONSTRUTOR — {features.length} MÓDULO{features.length > 1 ? 'S' : ''}
                          </p>
                        )}
                        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Funcionalidades">
                          {BUILDER_MODULES.map((module) => (
                            <button
                              key={module.id}
                              type="button"
                              role="checkbox"
                              aria-checked={features.includes(module.id)}
                              onClick={() => toggle(features, setFeatures, module.id)}
                              className={optionButton(features.includes(module.id))}
                            >
                              {module.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Plataformas">
                        {PLATFORMS.map((platform) => (
                          <button
                            key={platform}
                            type="button"
                            role="checkbox"
                            aria-checked={platforms.includes(platform)}
                            onClick={() => toggle(platforms, setPlatforms, platform)}
                            className={optionButton(platforms.includes(platform))}
                          >
                            {platform}
                          </button>
                        ))}
                      </div>
                    )}

                    {step === 4 && (
                      <div className="grid gap-2" role="radiogroup" aria-label="Estágio atual">
                        {STAGES.map((item) => (
                          <button
                            key={item}
                            type="button"
                            role="radio"
                            aria-checked={stage === item}
                            onClick={() => setStage(item)}
                            className={optionButton(stage === item)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}

                    {step === 5 && (
                      <form id="tbe-contact-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="tbe-name" className="mb-1 block text-sm text-[var(--tbe-text-2)]">
                            Nome *
                          </label>
                          <input id="tbe-name" type="text" autoComplete="name" {...register('name')} className={fieldClass} />
                          {errors.name && (
                            <p role="alert" className="mt-1 text-xs text-[var(--tbe-error)]">
                              {errors.name.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="tbe-company" className="mb-1 block text-sm text-[var(--tbe-text-2)]">
                            Empresa
                          </label>
                          <input id="tbe-company" type="text" autoComplete="organization" {...register('company')} className={fieldClass} />
                        </div>
                        <div>
                          <label htmlFor="tbe-email" className="mb-1 block text-sm text-[var(--tbe-text-2)]">
                            E-mail *
                          </label>
                          <input id="tbe-email" type="email" autoComplete="email" {...register('email')} className={fieldClass} />
                          {errors.email && (
                            <p role="alert" className="mt-1 text-xs text-[var(--tbe-error)]">
                              {errors.email.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="tbe-phone" className="mb-1 block text-sm text-[var(--tbe-text-2)]">
                            Telefone
                          </label>
                          <input id="tbe-phone" type="tel" autoComplete="tel" {...register('phone')} className={fieldClass} />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="tbe-message" className="mb-1 block text-sm text-[var(--tbe-text-2)]">
                            Mensagem adicional
                          </label>
                          <textarea id="tbe-message" rows={3} {...register('message')} className={fieldClass} />
                        </div>
                      </form>
                    )}
                  </motion.fieldset>
                </AnimatePresence>
              )}
            </div>

            {!submitted && (
              <>
                {error && (
                  <p role="alert" className="tbe-mono mt-4 text-[11px] tracking-wide text-[var(--tbe-warning)]">
                    ⚠ {error}
                  </p>
                )}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={back}
                    disabled={step === 0}
                    className="tbe-mono flex items-center gap-2 border border-[#0b1b33]/15 px-5 py-3 text-[11px] tracking-[0.25em] text-[var(--tbe-text-2)] transition-colors enabled:hover:border-[#0b1b33]/40 enabled:hover:text-[var(--tbe-text)] disabled:opacity-30"
                  >
                    <ArrowLeft size={14} aria-hidden="true" /> VOLTAR
                  </button>
                  {step === STEP_TITLES.length - 1 ? (
                    <button
                      type="submit"
                      form="tbe-contact-form"
                      className="tbe-cta tbe-mono flex items-center gap-2 border border-[var(--tbe-tq)] px-6 py-3 text-[11px] tracking-[0.25em] text-[var(--tbe-text)]"
                    >
                      TRANSMITIR <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={next}
                      className="tbe-cta tbe-mono flex items-center gap-2 border border-[var(--tbe-tq)] px-6 py-3 text-[11px] tracking-[0.25em] text-[var(--tbe-text)]"
                    >
                      AVANÇAR <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
