import CharacterLab from './CharacterLab';
import EvoCase from './EvoCase';
import JetpackArcade from './JetpackArcade';
import './portfolio.css';

/**
 * "Portfólio jogável" da TENKA Games: em vez de prints, o visitante mexe no
 * trabalho — gira os lutadores, vê a malha, percorre o case e joga o jogo.
 * Conteúdo em ./data.ts; assets em public/portfolio/games/.
 */
export default function PortfolioSection() {
  return (
    <section id="portfolio" className="tp-portfolio" aria-labelledby="portfolio-title">
      <div className="tg-section-heading tp-portfolio-heading tg-reveal">
        <p className="tg-kicker tg-mono">02 / PORTFÓLIO JOGÁVEL</p>
        <h2 id="portfolio-title">
          Não olhe.
          <br />
          Jogue.
        </h2>
        <p>
          Projetos reais da TENKA Games, abertos para você mexer: os personagens em 3D, o pipeline por trás de cada um, as
          telas do jogo e um jogo inteiro rodando nesta página.
        </p>
      </div>
      <CharacterLab />
      <EvoCase />
      <JetpackArcade />
    </section>
  );
}
