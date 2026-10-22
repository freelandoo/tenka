import { useCallback, useState } from 'react';
import TenkaHero from '../components/hero/TenkaHero';
import HomePositioning from '../components/site/HomePositioning';
import { useSeo } from '../seo/useSeo';
import { DIVISIONS } from '../tabloid/divisions';
import type { TenkaHeroSlide } from '../types/hero';

/**
 * A home tem dois andares: o hero (a vitrine das divisões, tela cheia) e, abaixo
 * dele, a página de verdade — posicionamento, entregas, prova e conversão.
 *
 * O H1 morava aqui como `sr-only` porque não havia texto nenhum na tela. Agora
 * ele é visível, dentro do `HomePositioning`, com a mesma frase que o manifesto
 * de SEO serve no HTML estático.
 *
 * O andar de baixo veste a cor do card ativo lá em cima: trocar de divisão no
 * hero repinta os detalhes da página inteira.
 */
function accentFor(slide: TenkaHeroSlide): string {
  switch (slide.division) {
    case 'games':
      return DIVISIONS.games.accent;
    case 'multimidia':
      return DIVISIONS.studios.accent;
    case 'desenvolvimento':
      return DIVISIONS.tech.accent;
    default:
      return slide.accentColor;
  }
}

export default function HomePage() {
  useSeo('/');
  const [active, setActive] = useState({ accent: DIVISIONS.games.accent, label: 'Games', to: '/games' });
  const onActiveSlideChange = useCallback(
    (slide: TenkaHeroSlide) =>
      setActive({
        accent: accentFor(slide),
        label: slide.navLabel,
        to: slide.division === 'games' ? '/games' : slide.division === 'multimidia' ? '/studios' : slide.division === 'desenvolvimento' ? '/tech' : '',
      }),
    [],
  );

  return (
    <main>
      <TenkaHero onActiveSlideChange={onActiveSlideChange} />
      <HomePositioning accent={active.accent} activeLabel={active.label} activeTo={active.to} />
    </main>
  );
}
