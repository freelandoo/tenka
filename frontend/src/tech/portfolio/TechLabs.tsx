import FreelandooLab from './FreelandooLab';
import ComunidadesLab from './ComunidadesLab';
import ColiseuLab from './ColiseuLab';
import IwLiveLab from './IwLiveLab';

/**
 * Produtos no ar da TENKA Tech: cada produto vira um laboratório no tema dele
 * (Freelandoo amarelo e preto, condomínio em cinza, Coliseu industrial,
 * Innovation Week vermelho e preto), com a interface recriada em código.
 */
export default function TechLabs() {
  return (
    <section id="produtos" className="tt-labs" aria-labelledby="products-title">
      <div className="tt-section-intro tt-reveal tt-labs-intro">
        <p className="tt-kicker tt-mono">02 / PRODUTOS NO AR</p>
        <h2 id="products-title">
          RODANDO
          <br />
          AGORA.
        </h2>
        <p>
          Produtos que a TENKA construiu e mantém em produção, abertos etapa por etapa — cada um vestido com a identidade
          dele. A Innovation Week, no fim, roda ao vivo.
        </p>
      </div>
      <FreelandooLab />
      <ComunidadesLab />
      <ColiseuLab />
      <IwLiveLab />
    </section>
  );
}
