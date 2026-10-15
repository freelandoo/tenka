import { useEffect, useState } from 'react';
import ShowcaseLab, { type ShowcaseStep } from '../../components/showcase/ShowcaseLab';
import { useGoogleFonts } from '../../hooks/useGoogleFonts';
import './reality-lab.css';

const ROOT = '/portfolio/studios/holo';

const STEPS: ShowcaseStep[] = [
  {
    id: 'pele',
    label: 'Pele Reality',
    title: 'Preto, branco e rosa.',
    text: 'A identidade de um reality ao vivo: manchete em Archivo expandida no peso máximo com textura gasta, letra de máquina de escrever, faixa rosa em seta, cantos cortados e um cubo de vidro rosa em 3D.',
  },
  {
    id: 'rankings',
    label: 'Rankings',
    title: 'Participantes × Audiência.',
    text: 'Dois rankings na mesma temporada: quem está jogando e quem está assistindo. O trilho "Quem está jogando" alterna entre os dois, e cada participante tem cofre, suspeita e capturas.',
    ms: 6500,
  },
  {
    id: 'loja',
    label: 'Loja oficial',
    title: 'Compre. Apoie. Faça parte.',
    text: 'A Conveniência Views é a loja oficial do reality: cada compra fica registrada no nome do participante que a pessoa escolhe apoiar.',
  },
  {
    id: 'ra',
    label: 'RA colecionável',
    title: 'O holograma vai para a vitrine.',
    text: 'O Lutador do Coliseu é o holograma 001, edição de estreia. Colecionado por R$ 1,99 no Mercado Pago, ele ocupa uma das 6 posições da vitrine — as outras esperam o próximo drop.',
  },
];

function Cube() {
  return (
    <div className="rv-cube" aria-hidden="true">
      {['f', 'b', 'l', 'r', 't', 'd'].map((face) => (
        <i key={face} className={`rv-cube-${face}`} />
      ))}
    </div>
  );
}

function SkinStage() {
  return (
    <div className="rv-stage rv-stage--skin">
      <p className="rv-type rv-top">
        <span className="rv-house" aria-hidden="true">⌂</span> A CASA VIEWS <b className="rv-live">● AO VIVO</b>
      </p>
      <h4 className="rv-wide rv-grunge rv-skin-title">
        A CASA
        <br />
        VIEWS
      </h4>
      <p className="rv-script">reality social em tempo real</p>
      <div className="rv-arrow">QUEM ESTÁ JOGANDO</div>
      <Cube />
      <ul className="rv-swatches">
        <li style={{ background: '#050505' }}>#050505</li>
        <li style={{ background: '#f4f4f0', color: '#050505' }}>#F4F4F0</li>
        <li style={{ background: '#ff007a' }}>#FF007A</li>
      </ul>
    </div>
  );
}

interface RankRow {
  n: string;
  score: number;
  vault?: string;
  susp?: number;
  caps?: number;
}

const PLAYERS: RankRow[] = [
  { n: '01', score: 9420, vault: 'R$ 4.500', susp: 72, caps: 9 },
  { n: '02', score: 7815, vault: 'R$ 3.120', susp: 41, caps: 6 },
  { n: '03', score: 6050, vault: 'R$ 2.240', susp: 18, caps: 4 },
  { n: '04', score: 4980, vault: 'R$ 1.900', susp: 55, caps: 3 },
];
const AUDIENCE: RankRow[] = [
  { n: '01', score: 12840 },
  { n: '02', score: 11210 },
  { n: '03', score: 9875 },
  { n: '04', score: 8130 },
];

function RankingsStage() {
  const [tab, setTab] = useState<'participantes' | 'audiencia'>('participantes');
  useEffect(() => {
    const timer = window.setInterval(() => setTab((t) => (t === 'participantes' ? 'audiencia' : 'participantes')), 3200);
    return () => window.clearInterval(timer);
  }, []);
  const rows = tab === 'participantes' ? PLAYERS : AUDIENCE;
  const max = rows[0].score;
  return (
    <div className="rv-stage rv-stage--rank">
      <h4 className="rv-wide rv-grunge rv-rank-title">RANKINGS</h4>
      <div className="rv-toggle rv-type" role="presentation">
        <button type="button" className={tab === 'participantes' ? 'is-on' : ''} onClick={() => setTab('participantes')}>
          PARTICIPANTES
        </button>
        <button type="button" className={tab === 'audiencia' ? 'is-on' : ''} onClick={() => setTab('audiencia')}>
          AUDIÊNCIA
        </button>
      </div>
      <ol className="rv-rows" key={tab}>
        {rows.map((row, i) => (
          <li key={row.n} style={{ animationDelay: `${i * 90}ms` }}>
            <span className="rv-pos rv-wide">{row.n}</span>
            <span className="rv-avatar" aria-hidden="true" />
            <span className="rv-name rv-type">{tab === 'participantes' ? `PARTICIPANTE ${row.n}` : `ESPECTADOR ${row.n}`}</span>
            <span className="rv-bar">
              <i style={{ width: `${(row.score / max) * 100}%` }} />
            </span>
            <b className="rv-score rv-type">{row.score.toLocaleString('pt-BR')}</b>
            {row.vault && (
              <span className="rv-meta rv-type">
                COFRE {row.vault} · SUSPEITA {row.susp}% · {row.caps} CAPTURAS
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="rv-demo rv-type">INTERFACE RECRIADA · DADOS ILUSTRATIVOS</p>
    </div>
  );
}

function StoreStage() {
  return (
    <div className="rv-stage rv-stage--store">
      <h4 className="rv-wide rv-grunge rv-store-title">CONVENIÊNCIA</h4>
      <p className="rv-wide rv-store-views">VIEWS</p>
      <p className="rv-script rv-store-script">♛ loja oficial</p>
      <div className="rv-product">
        <span className="rv-product-tag rv-type">♛ PRODUTO EM DESTAQUE</span>
        <div className="rv-product-art" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <p className="rv-product-support rv-type">🔥 APOIA: SUA ESCOLHA</p>
      </div>
      <div className="rv-support rv-type">
        <p>🔥 VOCÊ APOIA</p>
        <div className="rv-support-faces">
          <i />
          <i />
        </div>
        <small>SUA COMPRA FICA REGISTRADA NO NOME DE QUEM VOCÊ APOIA.</small>
      </div>
      <p className="rv-sticker rv-wide">
        COMPRE
        <br />
        APOIE
        <br />
        FAÇA PARTE
      </p>
    </div>
  );
}

function ArStage() {
  return (
    <div className="rv-stage rv-stage--ra">
      <div className="rv-holo-card">
        <img src={`${ROOT}/muay-thai.webp`} alt="O Lutador do Coliseu, holograma 001" />
        <span className="rv-type rv-holo-num">HOLOGRAMA 001</span>
        <p className="rv-wide rv-holo-name">O LUTADOR DO COLISEU</p>
        <p className="rv-type rv-holo-sub">MUAY THAI · KICK BOXING · EDIÇÃO DE ESTREIA</p>
        <button type="button" className="rv-collect rv-type" tabIndex={-1}>
          COLECIONAR · R$ 1,99
        </button>
      </div>
      <ol className="rv-vault">
        <li className="is-filled">
          <img src={`${ROOT}/muay-thai.webp`} alt="" />
        </li>
        {[2, 3, 4, 5, 6].map((n) => (
          <li key={n}>
            <span className="rv-type">PRÓXIMO DROP</span>
          </li>
        ))}
      </ol>
      <p className="rv-demo rv-type">GIRE E COLECIONE O HOLOGRAMA NA SEÇÃO ACIMA ↑</p>
    </div>
  );
}

/** Casa Views no formato laboratório, vestida com a pele Reality do próprio produto. */
export default function RealityLab() {
  useGoogleFonts('family=Archivo:wdth,wght@62..125,100..900&family=Space+Mono:wght@400;700');
  return (
    <ShowcaseLab
      theme="sl-theme-reality"
      kicker="IDENTIDADE · CASA VIEWS"
      title={
        <>
          Um reality
          <br />
          com cara de reality.
        </>
      }
      intro="A Casa Views é um reality social em tempo real dentro da Freelandoo. A TENKA desenhou a pele Reality e a aplicou nos rankings, na loja oficial e na realidade aumentada — recriadas aqui, peça por peça."
      steps={STEPS}
      renderStage={(step) =>
        step === 'pele' ? <SkinStage /> : step === 'rankings' ? <RankingsStage /> : step === 'loja' ? <StoreStage /> : <ArStage />
      }
      hudLeft="A CASA VIEWS · REALITY SOCIAL"
      aside={
        <dl className="sl-facts">
          <div>
            <dt>pele</dt>
            <dd>preto · branco · rosa</dd>
          </div>
          <div>
            <dt>rankings</dt>
            <dd>participantes × audiência</dd>
          </div>
          <div>
            <dt>RA</dt>
            <dd>holograma no pedestal do Coliseu</dd>
          </div>
        </dl>
      }
    />
  );
}
