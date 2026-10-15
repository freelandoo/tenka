import LabelAnatomy from './LabelAnatomy';
import HologramExhibit from './HologramExhibit';
import CasaViewsCase from './CasaViewsCase';
import './studio.css';

/**
 * "Estúdio aberto" da TENKA Studios: trabalho real, desmontado e explicado —
 * o rótulo Innovation Week em camadas, os hologramas de RA (astronauta e
 * lutador do Coliseu) e a identidade da Casa Views. Conteúdo em ./data.ts.
 */
export default function StudioSection() {
  return (
    <section id="estudio" className="tsp-studio" aria-labelledby="studio-title">
      <div className="ts-section-heading tsp-studio-heading ts-reveal">
        <p className="ts-kicker ts-mono">02 / ESTÚDIO ABERTO</p>
        <h2 id="studio-title" data-ts-focus data-ts-frame="FRAME 052 / ESTÚDIO">
          Por dentro
          <br />
          do trabalho.
        </h2>
        <p>
          Projetos no ar, abertos peça por peça: o que foi feito, como foi feito e por que funciona. Role, gire, colecione.
        </p>
      </div>
      <LabelAnatomy />
      <HologramExhibit />
      <CasaViewsCase />
    </section>
  );
}
