import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { readConsent, writeConsent } from '../../lib/consent';
import { shouldTrack } from '../../lib/analytics';

/**
 * Aviso de cookies.
 *
 * Desenhado a partir do que a ANPD orienta, não do padrão europeu:
 *
 * - Sem opção pré-marcada e sem consentimento tácito — a ANPD desaconselha
 *   presumir aceite pela continuidade da navegação, então "Entendi" só fecha o
 *   aviso e "Recusar medição" desliga a medição de verdade.
 * - Os dois botões têm o mesmo peso visual. Esconder a recusa num link cinza
 *   é o padrão escuro que a orientação justamente critica.
 * - Não bloqueia a tela. A medição se apoia em legítimo interesse, então
 *   prender o site atrás de um modal seria incoerente com a base declarada —
 *   e pioraria a experiência sem ganho de conformidade.
 * - Link para a política, onde a base legal de cada categoria está escrita.
 */
export default function ConsentBanner() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Só aparece para quem ainda não respondeu, e nunca na área interna —
    // o painel é ferramenta de trabalho de quem já é cliente ou equipe.
    if (readConsent() === null && shouldTrack(pathname)) setVisible(true);
  }, [pathname]);

  if (!visible) return null;

  const decide = (choice: 'granted' | 'denied') => {
    writeConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-white/15 bg-[#0a0b0d]/95 px-5 py-4 backdrop-blur sm:px-8"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-[13px] leading-[1.65] text-white/70">
          Usamos cookies para medir a audiência do site e entender o que é útil
          para quem chega aqui. Não usamos cookies de publicidade nem criamos
          perfis.{' '}
          <Link
            to="/politica-de-privacidade"
            className="text-white underline underline-offset-4"
          >
            Política de privacidade
          </Link>
          .
        </p>

        <div className="flex shrink-0 gap-3">
          {/* Mesmo peso visual nos dois: a recusa não pode ser mais difícil de
              achar que o aceite. */}
          <button
            type="button"
            onClick={() => decide('denied')}
            className="min-h-[44px] rounded-full border border-white/25 px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/10"
          >
            Recusar medição
          </button>
          <button
            type="button"
            onClick={() => decide('granted')}
            className="min-h-[44px] rounded-full bg-[#FF7A30] px-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[#08090b] transition-opacity hover:opacity-85"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
