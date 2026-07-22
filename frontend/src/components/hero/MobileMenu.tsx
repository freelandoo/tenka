import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { TenkaHeroSlide } from '../../types/hero';
import { padIndex } from '../../utils/format';
import SmartLink from '../SmartLink';

interface MobileMenuProps {
  slides: TenkaHeroSlide[];
  accentColor: string;
  onClose: () => void;
}

export default function MobileMenu({
  slides,
  accentColor,
  onClose,
}: MobileMenuProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Focus management: trap focus inside, close on Escape, restore focus.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !overlayRef.current) return;
      const focusables = overlayRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  useGSAP(
    () => {
      gsap.from(overlayRef.current, { autoAlpha: 0, duration: 0.25, ease: 'none' });
      gsap.from('[data-menu-item]', {
        y: 26,
        autoAlpha: 0,
        duration: 0.5,
        stagger: 0.06,
        delay: 0.08,
        ease: 'power3.out',
      });
    },
    { scope: overlayRef },
  );

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-[100] flex flex-col bg-[#0C0C0F] px-6 py-5 text-white sm:px-10"
    >
      <div className="flex items-center justify-between">
        <span
          className="text-2xl font-bold uppercase"
          style={{ letterSpacing: '-0.04em' }}
        >
          TENKA
          <span aria-hidden="true" style={{ color: accentColor }}>
            _
          </span>
        </span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="flex h-11 w-11 items-center justify-center text-white transition-opacity hover:opacity-70"
        >
          <X aria-hidden="true" className="h-7 w-7" strokeWidth={2} />
        </button>
      </div>

      <nav
        aria-label="Divisões"
        className="mt-14 flex flex-1 flex-col gap-6"
      >
        {slides.map((slide, index) => (
          <SmartLink
            key={slide.id}
            data-menu-item
            to={slide.ctaHref}
            onClick={onClose}
            className="group flex min-h-[44px] items-baseline gap-4"
          >
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: slide.accentColor }}
            >
              {padIndex(index + 1)}
            </span>
            <span className="font-display text-4xl uppercase leading-none transition-colors group-hover:text-white/70 sm:text-5xl">
              {slide.navLabel}
            </span>
          </SmartLink>
        ))}
      </nav>

      <nav
        aria-label="Menu secundário"
        className="mb-4 flex flex-col gap-1"
      >
        {[
          { to: '/projetos', label: 'Projetos' },
          { to: '/sobre', label: 'Sobre' },
          { to: '/contato', label: 'Contato' },
          { to: '/painel', label: 'Painel' },
          { to: '/admin/hero', label: 'Admin' },
        ].map((item) => (
          <Link
            key={item.to}
            data-menu-item
            to={item.to}
            onClick={onClose}
            className="flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.3em] text-white/55 transition-colors hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
