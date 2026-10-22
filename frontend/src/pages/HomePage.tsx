import TenkaHero from '../components/hero/TenkaHero';
import HomePositioning from '../components/site/HomePositioning';
import { useSeo } from '../seo/useSeo';

/**
 * A home tem dois andares: o hero (a vitrine das divisões, tela cheia) e, abaixo
 * dele, a página de verdade — posicionamento, entregas, prova e conversão.
 *
 * O H1 morava aqui como `sr-only` porque não havia texto nenhum na tela. Agora
 * ele é visível, dentro do `HomePositioning`, com a mesma frase que o manifesto
 * de SEO serve no HTML estático.
 */
export default function HomePage() {
  useSeo('/');

  return (
    <main>
      <TenkaHero />
      <HomePositioning />
    </main>
  );
}
