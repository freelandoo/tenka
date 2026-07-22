import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  background: string;
  accent: string;
}

/** Simple full-viewport placeholder used by the secondary routes. */
export default function PlaceholderPage({
  eyebrow,
  title,
  description,
  background,
  accent,
}: PlaceholderPageProps) {
  return (
    <main
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center font-sans text-white"
      style={{ backgroundColor: background }}
    >
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 sm:px-10 sm:py-6">
        <Link
          to="/"
          aria-label="TENKA — página inicial"
          className="flex min-h-[44px] items-center text-2xl font-bold uppercase"
          style={{ letterSpacing: '-0.04em' }}
        >
          TENKA
          <span aria-hidden="true" style={{ color: accent }}>
            _
          </span>
        </Link>
      </header>

      <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/70">
        {eyebrow}
      </p>
      <h1
        className="mt-4 font-display uppercase leading-[0.85]"
        style={{ fontSize: 'clamp(48px, 9vw, 140px)', letterSpacing: '-0.03em' }}
      >
        {title}
      </h1>
      <p className="mt-6 max-w-md text-sm leading-[1.55] text-white/85 md:text-base">
        {description}
      </p>

      <Link
        to="/"
        className="mt-10 inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-white px-6 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-white/[0.14]"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
        Voltar para a home
      </Link>
    </main>
  );
}
