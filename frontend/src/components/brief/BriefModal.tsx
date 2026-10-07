import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ArrowLeft, ArrowRight, Check, MessageCircle } from 'lucide-react';
import { isValidEmail, normalizeEmailInput } from '../../features/panel/format';
import {
  CONTACT_EMAIL,
  PHONE_DISPLAY,
  hasWhatsapp,
  mailtoUrl,
  whatsappUrl,
} from '../../config/contact';
import type { BriefConfig, BriefStep } from './briefConfig';

/**
 * Modal de briefing, em cinco passos, usado pelas três divisões.
 *
 * Generaliza o ProjectBriefModal que existia só na Tenka Games — mesmo fluxo,
 * mesma navegação por teclado, mesmo focus trap; o que muda são as perguntas,
 * que vêm de `briefConfig.ts`.
 *
 * Mudança importante em relação ao original: o envio **não** era enviado. O
 * modal antigo fazia `console.log` do briefing e mostrava "Transmissão
 * recebida", ou seja, todo lead preenchido ali era descartado em silêncio e a
 * pessoa saía achando que tinha falado com a TENKA. Agora a submissão abre o
 * WhatsApp (ou o e-mail, se o número ainda não estiver configurado) com a
 * mensagem montada, e o estado de sucesso diz o que de fato aconteceu.
 *
 * ponytail: segue sem backend. Quando existir um `POST /leads` público, trocar
 * `submit()` por um fetch e manter WhatsApp/e-mail como alternativa visível.
 */

export interface BriefModalProps {
  open: boolean;
  onClose: () => void;
  config: BriefConfig;
}

type Answers = Record<string, string | string[]>;

interface ContactInfo {
  name: string;
  email: string;
  company: string;
}

const EMPTY_CONTACT: ContactInfo = { name: '', email: '', company: '' };

export default function BriefModal({ open, onClose, config }: BriefModalProps) {
  const { steps, theme } = config;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [contact, setContact] = useState<ContactInfo>(EMPTY_CONTACT);
  const [error, setError] = useState<string | null>(null);
  const [sentVia, setSentVia] = useState<'whatsapp' | 'email' | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Estado transitório zera a cada abertura; as respostas ficam, para um
  // fechamento acidental não apagar o briefing já preenchido.
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      setError(null);
      setSentVia(null);
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

  // Escape precisa fechar mesmo quando o foco caiu no body (logo depois de um
  // passo desmontar seus botões), por isso o listener vive no documento.
  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, onClose]);

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

  const current = steps[step];

  const validate = (target: BriefStep): string | null => {
    if (target.kind === 'contact') {
      if (contact.name.trim().length < 2) return 'Informe seu nome.';
      if (!isValidEmail(contact.email)) return 'Informe um e-mail válido.';
      return null;
    }
    const value = answers[target.id];
    if (target.kind === 'multi') {
      return Array.isArray(value) && value.length > 0
        ? null
        : (target.requiredMessage ?? 'Selecione pelo menos uma opção.');
    }
    if (target.kind === 'text') {
      const text = typeof value === 'string' ? value.trim() : '';
      return text.length >= (target.minLength ?? 10)
        ? null
        : (target.requiredMessage ?? 'Preencha este campo.');
    }
    return value ? null : (target.requiredMessage ?? 'Selecione uma opção.');
  };

  /** Monta a mensagem no formato que chega legível no WhatsApp e no e-mail. */
  const buildMessage = () => {
    const lines = [`${config.subject}`, ''];
    for (const s of steps) {
      if (s.kind === 'contact') continue;
      const value = answers[s.id];
      const text = Array.isArray(value) ? value.join(', ') : (value ?? '—');
      lines.push(`${s.title}: ${text}`);
    }
    lines.push(
      '',
      `Nome: ${contact.name.trim()}`,
      `E-mail: ${normalizeEmailInput(contact.email)}`,
      `Empresa: ${contact.company.trim() || '—'}`,
    );
    return lines.join('\n');
  };

  const submit = () => {
    const body = buildMessage();
    if (hasWhatsapp) {
      window.open(whatsappUrl(body), '_blank', 'noopener');
      setSentVia('whatsapp');
    } else {
      window.location.href = mailtoUrl(config.subject, body);
      setSentVia('email');
    }
    requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    });
  };

  const next = () => {
    const validationError = validate(current);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (step < steps.length - 1) setStep(step + 1);
    else submit();
  };

  const back = () => {
    setError(null);
    if (step > 0) setStep(step - 1);
  };

  const pick = (id: string, option: string) =>
    setAnswers((prev) => ({ ...prev, [id]: option }));

  const toggle = (id: string, option: string) =>
    setAnswers((prev) => {
      const list = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      return {
        ...prev,
        [id]: list.includes(option)
          ? list.filter((item) => item !== option)
          : [...list, option],
      };
    });

  const optionClass = (selected: boolean) =>
    `${theme.monoClass} border px-4 py-3 text-left text-xs tracking-[0.15em] transition-colors ${
      selected
        ? 'border-[var(--brief-accent)] bg-[var(--brief-accent)]/10 text-[var(--brief-text)]'
        : 'border-white/15 text-[var(--brief-dim)] hover:border-white/40 hover:text-[var(--brief-text)]'
    }`;

  const fieldClass =
    'w-full border border-white/15 bg-[var(--brief-bg)] px-4 py-3 text-sm text-[var(--brief-text)] placeholder:text-[var(--brief-dim)] focus:border-[var(--brief-accent)] focus:outline-none';

  const themeVars = {
    '--brief-bg': theme.bg,
    '--brief-bg-elev': theme.bgElev,
    '--brief-accent': theme.accent,
    '--brief-accent-soft': theme.accentSoft,
    '--brief-text': theme.text,
    '--brief-dim': theme.dim,
    '--brief-ok': theme.ok,
  } as React.CSSProperties;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={themeVars}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
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
            className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto border border-white/15 bg-[var(--brief-bg-elev)] p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={`${theme.monoClass} text-[10px] tracking-[0.35em] text-[var(--brief-accent)]`}
                >
                  {config.eyebrow}
                </p>
                <h2
                  id="brief-title"
                  className={`${theme.displayClass} mt-2 text-xl font-bold text-[var(--brief-text)]`}
                >
                  {sentVia ? 'Briefing pronto' : current.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar formulário"
                className="p-1 text-[var(--brief-dim)] transition-colors hover:text-[var(--brief-text)]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {!sentVia && (
              <div className="mt-6" aria-hidden="true">
                <div className="h-px w-full bg-white/10">
                  <div
                    className="h-px bg-[var(--brief-accent)] transition-all duration-300"
                    style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  />
                </div>
                <p
                  className={`${theme.monoClass} mt-2 text-[9px] tracking-[0.3em] text-[var(--brief-dim)]`}
                >
                  PASSO {step + 1} / {steps.length}
                </p>
              </div>
            )}

            <div className="mt-6 min-h-[260px]">
              {sentVia ? (
                <SuccessState via={sentVia} theme={theme} onClose={onClose} />
              ) : (
                <AnimatePresence mode="wait">
                  <motion.fieldset
                    key={current.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.22 }}
                    className="border-0 p-0"
                  >
                    <legend className="sr-only">{current.title}</legend>

                    {current.kind === 'single' && (
                      <div
                        className={`grid gap-2 ${current.twoColumns ? 'sm:grid-cols-2' : ''}`}
                        role="radiogroup"
                        aria-label={current.title}
                      >
                        {current.options?.map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={answers[current.id] === option}
                            onClick={() => pick(current.id, option)}
                            className={optionClass(answers[current.id] === option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {current.kind === 'multi' && (
                      <div
                        className={`grid gap-2 ${current.twoColumns ? 'sm:grid-cols-2' : ''}`}
                        role="group"
                        aria-label={current.title}
                      >
                        {current.options?.map((option) => {
                          const list = (answers[current.id] as string[] | undefined) ?? [];
                          return (
                            <button
                              key={option}
                              type="button"
                              role="checkbox"
                              aria-checked={list.includes(option)}
                              onClick={() => toggle(current.id, option)}
                              className={optionClass(list.includes(option))}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {current.kind === 'text' && (
                      <div>
                        <label
                          htmlFor="brief-scope"
                          className="mb-2 block text-sm text-[var(--brief-dim)]"
                        >
                          {current.label}
                        </label>
                        <textarea
                          id="brief-scope"
                          rows={6}
                          value={(answers[current.id] as string) ?? ''}
                          onChange={(event) =>
                            setAnswers({ ...answers, [current.id]: event.target.value })
                          }
                          className={fieldClass}
                          placeholder={current.placeholder}
                        />
                      </div>
                    )}

                    {current.kind === 'contact' && (
                      <div className="grid gap-4">
                        <Field
                          id="brief-name"
                          label="Nome *"
                          autoComplete="name"
                          value={contact.name}
                          onChange={(name) => setContact({ ...contact, name })}
                          className={fieldClass}
                        />
                        <Field
                          id="brief-email"
                          label="E-mail *"
                          type="email"
                          autoComplete="email"
                          value={contact.email}
                          onChange={(email) =>
                            setContact({ ...contact, email: normalizeEmailInput(email) })
                          }
                          className={fieldClass}
                        />
                        <Field
                          id="brief-company"
                          label="Empresa (opcional)"
                          autoComplete="organization"
                          value={contact.company}
                          onChange={(company) => setContact({ ...contact, company })}
                          className={fieldClass}
                        />
                      </div>
                    )}
                  </motion.fieldset>
                </AnimatePresence>
              )}
            </div>

            {!sentVia && (
              <>
                {error && (
                  <p
                    role="alert"
                    className={`${theme.monoClass} mt-4 text-[11px] tracking-wide text-[var(--brief-accent-soft)]`}
                  >
                    {error}
                  </p>
                )}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={back}
                    disabled={step === 0}
                    className={`${theme.monoClass} flex items-center gap-2 border border-white/15 px-5 py-3 text-[11px] tracking-[0.25em] text-[var(--brief-dim)] transition-colors enabled:hover:border-white/40 enabled:hover:text-[var(--brief-text)] disabled:opacity-30`}
                  >
                    <ArrowLeft size={14} aria-hidden="true" /> VOLTAR
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className={`${theme.monoClass} flex items-center gap-2 border border-[var(--brief-accent)] bg-[var(--brief-accent)]/10 px-6 py-3 text-[11px] tracking-[0.25em] text-[var(--brief-text)] transition-colors hover:bg-[var(--brief-accent)]/20`}
                  >
                    {step === steps.length - 1
                      ? hasWhatsapp
                        ? 'ENVIAR'
                        : 'ENVIAR POR E-MAIL'
                      : 'AVANÇAR'}
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>

                {/* Caminho alternativo, sempre visível: quem não quer preencher
                    cinco passos fala direto. */}
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-[12px] leading-relaxed text-[var(--brief-dim)]">
                    Prefere falar direto?{' '}
                    {hasWhatsapp && (
                      <>
                        <a
                          href={whatsappUrl('Olá, TENKA! Vim pelo site.')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--brief-text)] underline underline-offset-4"
                        >
                          <MessageCircle size={12} aria-hidden="true" />
                          {PHONE_DISPLAY}
                        </a>
                        {' · '}
                      </>
                    )}
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="text-[var(--brief-text)] underline underline-offset-4"
                    >
                      {CONTACT_EMAIL}
                    </a>
                    {' · '}
                    <a href="/contato" className="text-[var(--brief-text)] underline underline-offset-4">
                      página de contato
                    </a>
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SuccessState({
  via,
  theme,
  onClose,
}: {
  via: 'whatsapp' | 'email';
  theme: BriefConfig['theme'];
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brief-ok)] text-[var(--brief-ok)]">
        <Check size={22} aria-hidden="true" />
      </span>
      <p className={`${theme.monoClass} text-[10px] tracking-[0.3em] text-[var(--brief-ok)]`}>
        BRIEFING MONTADO
      </p>
      {/* Honestidade sobre o que aconteceu: a mensagem foi aberta, não enviada.
          O modal antigo dizia "recebido" sem ter recebido nada. */}
      <p className="max-w-sm text-sm leading-relaxed text-[var(--brief-dim)]">
        {via === 'whatsapp'
          ? 'Abrimos o WhatsApp com o seu briefing já escrito. Revise e toque em enviar — a TENKA responde em até dois dias úteis.'
          : 'Abrimos seu cliente de e-mail com o briefing já escrito. Revise e envie — a TENKA responde em até dois dias úteis.'}
      </p>
      <button
        type="button"
        onClick={onClose}
        className={`${theme.monoClass} mt-4 border border-white/20 px-6 py-3 text-[11px] tracking-[0.25em] text-[var(--brief-text)] transition-colors hover:border-[var(--brief-accent)]`}
      >
        FECHAR
      </button>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  className,
  type = 'text',
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-[var(--brief-dim)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
    </div>
  );
}
