import { Link } from 'react-router-dom';
import { DIVISION_LIST } from './divisions';

/**
 * Cabeçalho das páginas na pele tabloide (/precos, /projetos). Uma peça só:
 * escrito duas vezes, os dois cabeçalhos divergem em silêncio.
 *
 * `current` é o item da página atual (fica sublinhado na cor da página).
 * Os estilos moram em `pricing/precos.css` (prefixo `pc-header`), que as
 * páginas tabloide importam.
 */
const PAGES = [
  { to: '/precos', label: 'Preços' },
  { to: '/projetos', label: 'Projetos' },
];

export default function TabloidHeader({ current, brand = '/images/brand/tenka-tech.svg' }: { current: string; brand?: string }) {
  return (
    <header className="pc-header">
      <Link to="/" className="pc-header__brand" aria-label="TENKA — página inicial">
        <img src={brand} alt="" width={150} height={35} />
      </Link>
      <nav className="pc-header__nav" aria-label="Divisões">
        {DIVISION_LIST.map((division) => (
          <Link key={division.id} to={division.to} className="tf-mono" style={{ ['--d' as string]: division.accent }}>
            <i aria-hidden="true" />
            {division.short}
          </Link>
        ))}
        {PAGES.map((page) =>
          page.to === current ? (
            <span key={page.to} className="tf-mono pc-header__here" aria-current="page">
              <i aria-hidden="true" />
              {page.label}
            </span>
          ) : (
            <Link key={page.to} to={page.to} className="tf-mono">
              <i aria-hidden="true" style={{ background: 'var(--tf-ink)' }} />
              {page.label}
            </Link>
          ),
        )}
      </nav>
      <div className="pc-header__right">
        {/* o WhatsApp não mora aqui: é o botão flutuante do site (App.tsx) */}
        <span className="tf-mono tf-live pc-header__live">
          <span className="tf-dot" /> No ar
        </span>
      </div>
    </header>
  );
}
