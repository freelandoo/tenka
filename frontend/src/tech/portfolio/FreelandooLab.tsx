import ShowcaseLab, { type ShowcaseStep } from '../../components/showcase/ShowcaseLab';
import './freelandoo-lab.css';

const FL = '/portfolio/tech/freelandoo';

const STEPS: ShowcaseStep[] = [
  {
    id: 'perfis',
    label: 'Perfis',
    title: 'Uma conta, vários perfis.',
    text: 'Profissional, professor, vendedor, influenciador e afiliado moram na mesma conta. Cada perfil é um caminho dentro da Freelandoo, com vitrine e ferramentas próprias.',
  },
  {
    id: 'perfil',
    label: 'Perfil público',
    title: 'O headcard da Freelandoo.',
    text: 'O perfil do Enzo Cortes, recriado peça por peça: etiqueta da categoria, foto em moldura amarela, selo de comunidade, nível, mensagem, seguir e as abas de feed e produtos.',
    ms: 6000,
  },
  {
    id: 'vender',
    label: 'Vender',
    title: 'Serviços, cursos e produtos.',
    text: 'Venda de produtos físicos e digitais, cursos em vídeo, serviços com agenda e posts e stories para divulgar — tudo na mesma plataforma.',
  },
  {
    id: 'afiliados',
    label: 'Afiliados',
    title: 'Ganhe divulgando.',
    text: 'Qualquer pessoa pode virar afiliada: escolhe o que divulgar, compartilha o próprio link e, quando a venda acontece por ele, a comissão cai na carteira.',
  },
];

const PATHS = [
  { id: 'afiliado', label: 'Afiliado', text: 'Promova e ganhe com produtos, serviços e cursos' },
  { id: 'cursos', label: 'Cursos', text: 'Crie e venda seus cursos online' },
  { id: 'produtos', label: 'Produtos', text: 'Venda produtos físicos, digitais e infoprodutos' },
  { id: 'servicos', label: 'Serviços', text: 'Divulgue seus serviços e conecte-se com clientes' },
  { id: 'influenciador', label: 'Influenciador', text: 'Monetize sua audiência recomendando o que você usa' },
];

function PathsStage() {
  return (
    <div className="fl-stage fl-stage--paths">
      <p className="fl-eyebrow">escolha o seu</p>
      <h4 className="fl-title">
        SEU CAMINHO DENTRO <span className="fl-mark">DA FREELANDOO.</span>
      </h4>
      <ul className="fl-paths">
        {PATHS.map((path, i) => (
          <li key={path.id} style={{ animationDelay: `${i * 110}ms` }}>
            <img src={`${FL}/path-${path.id}.webp`} alt="" loading="lazy" />
            <b>{path.label}</b>
            <span>{path.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileStage() {
  return (
    <div className="fl-stage fl-stage--profile">
      <div className="fl-cover">
        <span className="fl-cat">BELEZA E BEM-ESTAR</span>
        <span className="fl-level">
          NÍVEL<b>0</b>
        </span>
      </div>
      <div className="fl-headcard">
        <div className="fl-avatar">
          <img src={`${FL}/enzo-cortes.webp`} alt="Enzo Cortes" />
          <span className="fl-badge" aria-hidden="true">
            👥
          </span>
        </div>
        <p className="fl-name">ENZO CORTES</p>
        <div className="fl-actions" aria-hidden="true">
          <span className="fl-btn fl-btn--ghost">➤</span>
          <span className="fl-btn">+</span>
          <span className="fl-btn fl-btn--text">ENTRAR</span>
        </div>
      </div>
      <div className="fl-tabs">
        <span className="is-on">FEED</span>
        <span>PRODUTOS</span>
      </div>
      <div className="fl-feed">AINDA NÃO HÁ PUBLICAÇÕES. SEJA O PRIMEIRO!</div>
    </div>
  );
}

const BENTO = [
  { img: 'bento-1', label: 'Vendas fáceis' },
  { img: 'bento-4', label: 'Venda produtos' },
  { img: 'bento-9', label: 'Vídeos e cursos' },
  { img: 'bento-10', label: 'Posts & stories' },
];

function SellStage() {
  return (
    <div className="fl-stage fl-stage--sell">
      <h4 className="fl-title">
        TUDO QUE VOCÊ PRECISA PARA <span className="fl-mark">GANHAR MAIS.</span>
      </h4>
      <ul className="fl-bento">
        {BENTO.map((item, i) => (
          <li key={item.img} style={{ animationDelay: `${i * 120}ms` }}>
            <img src={`${FL}/${item.img}.webp`} alt="" loading="lazy" />
            <b>{item.label}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AffiliateStage() {
  return (
    <div className="fl-stage fl-stage--aff">
      <h4 className="fl-title">
        GANHE COMO <span className="fl-mark">AFILIADO.</span>
      </h4>
      <ol className="fl-flow">
        <li>
          <i>1</i>
          <b>Escolha</b>
          <span>um produto, curso ou serviço da vitrine</span>
        </li>
        <li>
          <i>2</i>
          <b>Compartilhe</b>
          <span className="fl-link">o seu link de afiliado</span>
        </li>
        <li>
          <i>3</i>
          <b>Venda feita</b>
          <span>alguém compra pelo seu link</span>
        </li>
        <li className="fl-flow-win">
          <i>✓</i>
          <b>Comissão</b>
          <span>cai na sua carteira</span>
        </li>
      </ol>
      <img className="fl-aff-art" src={`${FL}/bento-11.webp`} alt="" loading="lazy" />
    </div>
  );
}

/** Freelandoo no formato laboratório, no tema da própria plataforma. */
export default function FreelandooLab() {
  return (
    <ShowcaseLab
      theme="sl-theme-freelandoo"
      kicker="PLATAFORMA · FREELANDOO"
      title={
        <>
          Venda, ensine,
          <br />
          ganhe como afiliado.
        </>
      }
      intro="A Freelandoo conecta quem quer ganhar dinheiro com quem precisa aprender, criar, comprar e empreender. Construída e mantida pela TENKA, em produção em freelandoo.com.br."
      steps={STEPS}
      renderStage={(step) =>
        step === 'perfis' ? <PathsStage /> : step === 'perfil' ? <ProfileStage /> : step === 'vender' ? <SellStage /> : <AffiliateStage />
      }
      hudLeft="FREELANDOO.COM.BR"
      aside={
        <>
          <div className="sl-chips">
            {['Next.js 16', 'React 19', 'Express 5', 'PostgreSQL', 'Socket.IO', 'LiveKit'].map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
          <a className="sl-link" href="https://www.freelandoo.com.br" target="_blank" rel="noopener noreferrer">
            Abrir a Freelandoo ↗
          </a>
        </>
      }
    />
  );
}
