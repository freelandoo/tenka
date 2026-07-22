import { Link } from 'react-router-dom';
import { LockKeyhole, Menu } from 'lucide-react';
import type { TenkaHeroSlide } from '../../types/hero';
import { pickAccentOrWhite } from '../../utils/color';

interface HeroHeaderProps {
  slides: TenkaHeroSlide[];
  activeIndex: number;
  activeSlide: TenkaHeroSlide;
  isAnimating: boolean;
  onSelectDivision: (index: number) => void;
  onOpenMenu: () => void;
}

export default function HeroHeader({
  slides,
  activeIndex,
  activeSlide,
  isAnimating,
  onSelectDivision,
  onOpenMenu,
}: HeroHeaderProps) {
  const underscoreColor = pickAccentOrWhite(
    activeSlide.accentColor,
    activeSlide.backgroundColor,
  );

  return (
    <header className="absolute inset-x-0 top-0 z-[80]">
      <div className="flex items-center justify-between px-5 py-4 sm:px-10 sm:py-6 lg:px-14">
        <Link
          to="/"
          data-hero-logo
          aria-label="TENKA — página inicial"
          className="flex min-h-[44px] items-center text-2xl font-bold uppercase text-white"
          style={{ letterSpacing: '-0.04em' }}
        >
          TENKA
          <span aria-hidden="true" style={{ color: underscoreColor }}>
            _
          </span>
        </Link>

        {/* Center: division navigation (desktop only) */}
        <nav aria-label="Divisões" className="hidden items-center gap-9 md:flex">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => onSelectDivision(index)}
              disabled={isAnimating}
              aria-current={index === activeIndex ? 'true' : undefined}
              className={`min-h-[44px] text-[11px] font-bold uppercase tracking-[0.28em] transition-colors duration-300 ${
                index === activeIndex
                  ? 'text-white'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              {slide.navLabel}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-7">
          <nav
            aria-label="Menu principal"
            className="hidden items-center gap-7 lg:flex"
          >
            <Link
              to="/projetos"
              className="min-h-[44px] py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70 transition-colors hover:text-white"
            >
              Projetos
            </Link>
            <Link
              to="/sobre"
              className="min-h-[44px] py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70 transition-colors hover:text-white"
            >
              Sobre
            </Link>
            <Link
              to="/contato"
              className="min-h-[44px] py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70 transition-colors hover:text-white"
            >
              Contato
            </Link>
            {/* Área interna: /painel cai no login quando deslogado e vai
                direto para o Kanban/Carteira quando já há sessão. */}
            <Link
              to="/painel"
              className="flex min-h-[44px] items-center gap-2 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45 transition-colors hover:text-white"
            >
              <LockKeyhole aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />
              Painel
            </Link>
          </nav>

          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Abrir menu"
            className="flex h-11 w-11 items-center justify-center text-white transition-opacity hover:opacity-75"
          >
            <Menu aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
