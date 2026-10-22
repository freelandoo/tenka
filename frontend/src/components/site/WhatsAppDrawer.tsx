import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { saveLead } from '../../lib/api/leads';
import { trackContactClick, trackLead } from '../../lib/analytics';
import { whatsappUrl } from '../../config/contact';
import './whatsapp-drawer.css';

/**
 * Botão flutuante de WhatsApp com gaveta de captura de lead.
 *
 * A gaveta abre sozinha UMA vez por sessão, no primeiro scroll — é o momento
 * em que a pessoa já decidiu ficar na página. Fechar vale para a sessão toda;
 * o botão continua lá. Quem já mandou o contato não é incomodado de novo.
 *
 * O WhatsApp abre no próprio clique (antes de qualquer `await`: abrir janela
 * depois de uma promessa cai no bloqueador de pop-up) e o lead vai para
 * `POST /leads` em paralelo, com `keepalive`. Se a pessoa desistir no
 * WhatsApp, nome e número já ficaram no banco.
 */

const SESSION_KEY = 'tenka.wa-drawer.auto';
const SENT_KEY = 'tenka.wa-drawer.sent';
const OPEN_AFTER_PX = 160;

const GLYPH =
  'M16.003 3C8.832 3 3 8.832 3 16.003c0 2.292.6 4.53 1.74 6.5L3 29l6.66-1.716a12.95 12.95 0 0 0 6.343 1.62h.005C23.173 28.904 29 23.072 29 15.9 29 8.73 23.174 3 16.003 3Zm0 23.71h-.004a10.77 10.77 0 0 1-5.49-1.503l-.394-.234-3.953 1.018 1.055-3.85-.257-.407a10.7 10.7 0 0 1-1.65-5.73c0-5.94 4.835-10.773 10.78-10.773 5.94 0 10.775 4.833 10.775 10.773 0 5.94-4.833 10.706-10.862 10.706Zm5.91-8.05c-.324-.162-1.917-.946-2.214-1.054-.297-.108-.513-.162-.729.162-.216.324-.837 1.054-1.026 1.27-.189.216-.378.243-.702.081-.324-.162-1.368-.504-2.606-1.608-.963-.859-1.613-1.92-1.802-2.244-.189-.324-.02-.499.142-.66.146-.145.324-.378.486-.567.162-.189.216-.324.324-.54.108-.216.054-.405-.027-.567-.081-.162-.729-1.756-.999-2.404-.263-.632-.53-.546-.729-.556l-.621-.011a1.19 1.19 0 0 0-.864.405c-.297.324-1.134 1.108-1.134 2.702s1.161 3.134 1.323 3.35c.162.216 2.285 3.49 5.536 4.894.774.334 1.378.534 1.849.683.777.247 1.484.212 2.043.129.623-.093 1.917-.784 2.188-1.54.27-.757.27-1.405.189-1.54-.08-.135-.297-.216-.621-.378Z';

/** Camadas de trás do glifo: a espessura do "3D" (cada uma 1px mais funda). */
const DEPTH_LAYERS = 7;

function readFlag(storage: 'local' | 'session', key: string): boolean {
  try {
    return (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(storage: 'local' | 'session', key: string): void {
  try {
    (storage === 'local' ? window.localStorage : window.sessionStorage).setItem(key, '1');
  } catch {
    // aba anônima/bloqueada: só volta a abrir sozinha na próxima visita
  }
}

function WhatsAppGlyph3D() {
  const gradId = useId();
  return (
    <span className="wa-glyph" aria-hidden="true">
      {Array.from({ length: DEPTH_LAYERS }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 32 32"
          className="wa-glyph__layer"
          style={{ transform: `translateZ(${-(i + 1)}px)`, opacity: 1 - i * 0.06 }}
        >
          <path d={GLYPH} fill={i === DEPTH_LAYERS - 1 ? '#03361a' : '#0a7a3a'} />
        </svg>
      ))}
      <svg viewBox="0 0 32 32" className="wa-glyph__layer wa-glyph__face">
        <defs>
          <linearGradient id={`${gradId}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9dffbf" />
            <stop offset="0.38" stopColor="#3df27f" />
            <stop offset="1" stopColor="#14b357" />
          </linearGradient>
          <clipPath id={`${gradId}-c`}>
            <path d={GLYPH} />
          </clipPath>
        </defs>
        <path d={GLYPH} fill={`url(#${gradId}-g)`} />
        {/* reflexo especular, recortado pelo próprio glifo */}
        <ellipse cx="11" cy="9" rx="10" ry="6" fill="#fff" opacity="0.45" clipPath={`url(#${gradId}-c)`} />
      </svg>
    </span>
  );
}

export default function WhatsAppDrawer({ source, division }: { source: string; division: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(() => readFlag('local', SENT_KEY));
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const drawerId = useId();

  // abre sozinha no primeiro scroll, uma vez por sessão
  useEffect(() => {
    if (readFlag('session', SESSION_KEY) || readFlag('local', SENT_KEY)) return;
    const onScroll = () => {
      if (window.scrollY < OPEN_AFTER_PX) return;
      window.removeEventListener('scroll', onScroll);
      writeFlag('session', SESSION_KEY);
      setOpen(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggle = useCallback(() => {
    writeFlag('session', SESSION_KEY);
    setOpen((was) => {
      // aberta pelo clique: foco no nome (aberta sozinha não rouba o foco)
      if (!was) window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 320);
      return !was;
    });
  }, []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const phone = String(form.get('phone') ?? '').replace(/\D/g, '');
    const honeypot = String(form.get('website') ?? '');
    if (name.length < 2) return setError('Diz seu nome para a gente te chamar.');
    if (phone.length < 10 || phone.length > 13) return setError('Confere o WhatsApp com DDD.');
    setError('');

    const message = `Olá! Sou ${name} e vi que vocês têm ofertas hoje. Quero saber mais! (meu WhatsApp: ${phone})`;
    window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer');
    trackContactClick('whatsapp', `${source}-gaveta`);
    void saveLead({
      source,
      division,
      name,
      message,
      answers: { whatsapp: phone, oferta: 'ofertas-de-hoje' },
      ...(honeypot ? { website: honeypot } : {}),
    }).then((stored) => trackLead('whatsapp', source, stored));
    writeFlag('local', SENT_KEY);
    setSent(true);
  };

  return (
    <div className={`wa-dock${open ? ' is-open' : ''}`}>
      <div className="wa-drawer" id={drawerId} role="dialog" aria-label="Ofertas de hoje no WhatsApp" aria-hidden={!open}>
        <div className="wa-drawer__panel">
          <button type="button" className="wa-drawer__close" onClick={() => setOpen(false)} aria-label="Fechar" tabIndex={open ? 0 : -1}>
            <X size={16} strokeWidth={2.5} />
          </button>
          <p className="wa-drawer__live">
            <span className="wa-drawer__dot" /> Online agora
          </p>
          <p className="wa-drawer__title">Temos muitas ofertas hoje!</p>
          {sent ? (
            <>
              <p className="wa-drawer__text">Seu WhatsApp abriu numa nova aba. Se não abriu, toque abaixo.</p>
              <a
                className="wa-drawer__cta"
                href={whatsappUrl('Olá! Vi que vocês têm ofertas hoje. Quero saber mais!')}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={open ? 0 : -1}
                onClick={() => trackContactClick('whatsapp', `${source}-gaveta`)}
              >
                Abrir o WhatsApp ↗
              </a>
            </>
          ) : (
            <form className="wa-drawer__form" onSubmit={onSubmit} noValidate>
              <p className="wa-drawer__text">Chame aqui: a gente te responde no WhatsApp com a oferta do dia.</p>
              <label className="wa-drawer__field">
                <span>Seu nome</span>
                <input ref={nameRef} name="name" autoComplete="given-name" maxLength={120} tabIndex={open ? 0 : -1} />
              </label>
              <label className="wa-drawer__field">
                <span>Seu WhatsApp</span>
                <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" maxLength={20} tabIndex={open ? 0 : -1} />
              </label>
              {/* honeypot: humano não vê, robô preenche */}
              <input name="website" tabIndex={-1} autoComplete="off" className="wa-drawer__hp" aria-hidden="true" />
              {error && (
                <p className="wa-drawer__error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="wa-drawer__cta" tabIndex={open ? 0 : -1}>
                Chamar no WhatsApp ↗
              </button>
              <p className="wa-drawer__fine">Resposta rápida · sem compromisso</p>
            </form>
          )}
        </div>
      </div>

      <button
        type="button"
        className="wa-fab"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={drawerId}
        aria-label={open ? 'Fechar ofertas do WhatsApp' : 'Ofertas de hoje: chamar no WhatsApp'}
      >
        <span className="wa-fab__ring" aria-hidden="true" />
        <WhatsAppGlyph3D />
        {!open && (
          <span className="wa-fab__badge" aria-hidden="true">
            1
          </span>
        )}
      </button>
    </div>
  );
}
