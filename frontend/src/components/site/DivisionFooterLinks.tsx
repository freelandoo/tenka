import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../../config/contact';
import { SLOGAN } from '../../data/positioning';

/**
 * Saída e assinatura no rodapé das três divisões.
 *
 * As experiências de /games, /studios e /tech fechavam com marca + uma linha de
 * serviços + um slogan de produção ("CREATE. BUILD. PLAY."): nenhum link para
 * contato, projetos, sobre ou para as outras duas divisões. Quem chegava pela
 * busca numa divisão não tinha para onde ir — nem como falar com a empresa.
 *
 * Os rodapés são grid de três colunas (`1fr auto 1fr`) definidos no CSS de cada
 * divisão; por isso este bloco entra como um item que ocupa a linha inteira, em
 * vez de pedir mudança nos três arquivos de estilo. Cor e fonte vêm por herança
 * do próprio rodapé, então cada divisão continua com a sua identidade.
 */

interface DivisionFooterLinksProps {
  /** Divisão atual — sai da lista para não linkar para si mesma. */
  current: '/games' | '/studios' | '/tech';
}

const DIVISIONS = [
  { to: '/games', label: 'TENKA Games' },
  { to: '/studios', label: 'TENKA Studios' },
  { to: '/tech', label: 'TENKA Tech' },
];

const GROUP = [
  { to: '/precos', label: 'Preços de sites' },
  { to: '/projetos', label: 'Projetos no ar' },
  { to: '/sobre', label: 'Sobre a TENKA' },
  { to: '/contato', label: 'Contar minha ideia' },
];

export default function DivisionFooterLinks({ current }: DivisionFooterLinksProps) {
  return (
    <div
      className="mt-2 flex flex-col gap-4 border-t border-white/10 pt-6"
      style={{ gridColumn: '1 / -1' }}
    >
      <nav
        aria-label="Grupo TENKA"
        className="flex flex-wrap items-center gap-x-6 gap-y-3"
      >
        {[...DIVISIONS.filter((item) => item.to !== current), ...GROUP].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            {item.label}
          </Link>
        ))}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="opacity-70 transition-opacity hover:opacity-100"
        >
          {CONTACT_EMAIL}
        </a>
      </nav>
      <p className="m-0 tracking-[0.2em] opacity-60">Tenka Group — {SLOGAN}</p>
    </div>
  );
}
