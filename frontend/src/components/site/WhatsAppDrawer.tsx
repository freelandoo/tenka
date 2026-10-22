import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { trackContactClick } from '../../lib/analytics';
import { whatsappUrl } from '../../config/contact';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { LogoHandle } from './whatsapp3d/scene';
import './whatsapp-drawer.css';

/**
 * Botão flutuante de WhatsApp com gaveta "ofertas de hoje", no site todo.
 *
 * A gaveta abre sozinha UMA vez por sessão, no primeiro scroll — é o momento
 * em que a pessoa já decidiu ficar. Fechar vale para a sessão; o botão fica.
 * Quem já clicou para chamar não é incomodado de novo. Sem formulário: o
 * caminho é direto para a conversa (pedido do Alex — campo é atrito).
 */

const SESSION_KEY = 'tenka.wa-drawer.auto';
const SENT_KEY = 'tenka.wa-drawer.sent';
const OPEN_AFTER_PX = 160;
const MESSAGE = 'Olá! Vi que vocês têm muitas ofertas hoje. Quero saber mais!';

export const WHATSAPP_GLYPH =
  'M16.003 3C8.832 3 3 8.832 3 16.003c0 2.292.6 4.53 1.74 6.5L3 29l6.66-1.716a12.95 12.95 0 0 0 6.343 1.62h.005C23.173 28.904 29 23.072 29 15.9 29 8.73 23.174 3 16.003 3Zm0 23.71h-.004a10.77 10.77 0 0 1-5.49-1.503l-.394-.234-3.953 1.018 1.055-3.85-.257-.407a10.7 10.7 0 0 1-1.65-5.73c0-5.94 4.835-10.773 10.78-10.773 5.94 0 10.775 4.833 10.775 10.773 0 5.94-4.833 10.706-10.862 10.706Zm5.91-8.05c-.324-.162-1.917-.946-2.214-1.054-.297-.108-.513-.162-.729.162-.216.324-.837 1.054-1.026 1.27-.189.216-.378.243-.702.081-.324-.162-1.368-.504-2.606-1.608-.963-.859-1.613-1.92-1.802-2.244-.189-.324-.02-.499.142-.66.146-.145.324-.378.486-.567.162-.189.216-.324.324-.54.108-.216.054-.405-.027-.567-.081-.162-.729-1.756-.999-2.404-.263-.632-.53-.546-.729-.556l-.621-.011a1.19 1.19 0 0 0-.864.405c-.297.324-1.134 1.108-1.134 2.702s1.161 3.134 1.323 3.35c.162.216 2.285 3.49 5.536 4.894.774.334 1.378.534 1.849.683.777.247 1.484.212 2.043.129.623-.093 1.917-.784 2.188-1.54.27-.757.27-1.405.189-1.54-.08-.135-.297-.216-.621-.378Z';

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

/** Plano B e primeiro desenho: o glifo em camadas CSS (enquanto o three não chega). */
function CssGlyph() {
  const gradId = useId();
  return (
    <span className="wa-glyph" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <svg key={i} viewBox="0 0 32 32" className="wa-glyph__layer" style={{ transform: `translateZ(${-(i + 1)}px)` }}>
          <path d={WHATSAPP_GLYPH} fill={i === 5 ? '#03361a' : '#0a7a3a'} />
        </svg>
      ))}
      <svg viewBox="0 0 32 32" className="wa-glyph__layer">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9dffbf" />
            <stop offset="0.4" stopColor="#3df27f" />
            <stop offset="1" stopColor="#14b357" />
          </linearGradient>
        </defs>
        <path d={WHATSAPP_GLYPH} fill={`url(#${gradId})`} />
      </svg>
    </span>
  );
}

/**
 * Logo em 3D (three.js, `whatsapp3d/scene.ts`). Só é importado quando a página
 * assenta (idle), para não disputar banda com o que a página precisa primeiro.
 */
function WhatsAppLogo3D({ handleRef }: { handleRef: React.MutableRefObject<LogoHandle | null> }) {
  const host = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let alive = true;
    const start = () =>
      import('./whatsapp3d/scene')
        .then(({ mountWhatsAppLogo }) => {
          if (!alive) return;
          handleRef.current = mountWhatsAppLogo(el, {
            glyph: WHATSAPP_GLYPH,
            reduced,
            onFirstFrame: () => alive && setReady(true),
          });
        })
        .catch(() => {
          // sem WebGL (ou o chunk não veio): fica o glifo CSS
        });
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void start(), { timeout: 2500 })
      : window.setTimeout(() => void start(), 1200);
    return () => {
      alive = false;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      handleRef.current?.destroy();
      handleRef.current = null;
      setReady(false);
    };
  }, [reduced, handleRef]);

  return (
    <span className={`wa-logo${ready ? ' is-3d' : ''}`} aria-hidden="true">
      <CssGlyph />
      <span ref={host} className="wa-logo__gl" />
    </span>
  );
}

export default function WhatsAppDrawer({ source }: { source: string }) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const logo = useRef<LogoHandle | null>(null);

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

  const call = () => {
    trackContactClick('whatsapp', `${source}-gaveta`);
    writeFlag('local', SENT_KEY);
    setOpen(false);
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
          <p className="wa-drawer__text">Chame aqui no WhatsApp e garanta a sua.</p>
          <a
            className="wa-drawer__cta"
            href={whatsappUrl(MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={open ? 0 : -1}
            onClick={call}
          >
            Chamar no WhatsApp ↗
          </a>
          <p className="wa-drawer__fine">Resposta rápida · sem compromisso</p>
        </div>
      </div>

      <button
        type="button"
        className="wa-fab"
        onClick={() => {
          writeFlag('session', SESSION_KEY);
          setOpen((was) => !was);
        }}
        onPointerEnter={() => logo.current?.spin()}
        aria-expanded={open}
        aria-controls={drawerId}
        aria-label={open ? 'Fechar ofertas do WhatsApp' : 'Ofertas de hoje: chamar no WhatsApp'}
      >
        <WhatsAppLogo3D handleRef={logo} />
      </button>
    </div>
  );
}
