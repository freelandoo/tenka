import TenkaHero from '../components/hero/TenkaHero';
import { routeFor } from '../seo/routes';
import { useSeo } from '../seo/useSeo';

const HOME = routeFor('/')!;

export default function HomePage() {
  useSeo(HOME);

  return (
    <main>
      {/* O hero é um carrossel de divisões sem título de display — por isso a
          home não tinha H1 nenhum. Ele entra como `sr-only`: cabeçalho real
          para crawler e leitor de tela, sem alterar a composição visual. */}
      <h1 className="sr-only">{HOME.h1}</h1>
      <TenkaHero />
    </main>
  );
}
