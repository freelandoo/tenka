import { useEffect, useState } from 'react';
import ShowcaseLab, { type ShowcaseStep } from '../../components/showcase/ShowcaseLab';
import './comunidades-lab.css';

const STEPS: ShowcaseStep[] = [
  {
    id: 'explorar',
    label: 'Comunidades',
    title: 'Encontre e participe.',
    text: 'Negócios, condomínios, bairros, pets, carros e academias numa vitrine só, com busca por nome ou endereço e filtro por tipo.',
    ms: 6500,
  },
  {
    id: 'lider',
    label: 'Com líder',
    title: 'Líder, membros, temporada.',
    text: 'Comunidade de negócio, condomínio ou bairro tem líder, membros, temporada e moderação. O negócio pode ser privado e pago — o líder decide quem entra.',
  },
  {
    id: 'plataformas',
    label: 'Plataformas',
    title: 'Abertas, sem membros.',
    text: 'Pet, carro, games e financeiro são plataformas com feed público. A aba "mesmo X" recorta o mesmo feed: mesma raça, mesmo modelo de carro, mesmo jogo.',
  },
  {
    id: 'condominio',
    label: 'Condomínio',
    title: 'Só para moradores.',
    text: 'O condomínio é uma comunidade fechada para quem mora no prédio, com pele própria em cinza claro e abas de feed, serviços e produtos dos vizinhos.',
  },
  {
    id: 'vitrine',
    label: 'Vitrine',
    title: 'A vitrine entre vizinhos.',
    text: 'Uma grade de 12 lugares em que cada vaga se aluga por um mês para anunciar um serviço ou produto para o prédio. Lotou, abre mais uma fileira.',
  },
];

const COMMUNITIES = [
  { name: 'Enzo Cortes', type: 'comunidade', tag: 'BELEZA E BEM-ESTAR', img: '/portfolio/tech/freelandoo/enzo-cortes.webp' },
  { name: 'Residencial', type: 'condominio', tag: 'CONDOMÍNIO', place: 'São Bernardo do Campo · SP' },
  { name: 'Pinkoracats Nail Art', type: 'comunidade', tag: 'BELEZA E BEM-ESTAR' },
  { name: 'Meu pet', type: 'pet', tag: 'PET' },
  { name: 'EcoLuz Energia Solar', type: 'comunidade', tag: 'CONSTRUÇÃO' },
  { name: 'Meu carro', type: 'carro', tag: 'CARRO' },
  { name: 'Ricardo Fogões', type: 'comunidade', tag: 'COMUNIDADE' },
  { name: 'Fitness', type: 'academia', tag: 'ACADEMIA' },
];
const FILTERS = ['todos', 'comunidade', 'condominio', 'pet', 'carro', 'academia'];
const FILTER_LABEL: Record<string, string> = { todos: 'TODOS', comunidade: 'COMUNIDADE', condominio: 'CONDOMÍNIO', pet: 'PET', carro: 'CARRO', academia: 'ACADEMIA' };
const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

function ExploreStage() {
  const [filter, setFilter] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setFilter((f) => (f + 1) % FILTERS.length), 1100);
    return () => window.clearInterval(timer);
  }, []);
  const active = FILTERS[filter];
  const shown = COMMUNITIES.filter((c) => active === 'todos' || c.type === active);
  return (
    <div className="cm-stage">
      <p className="cm-kicker">👥 COMUNIDADES</p>
      <h4 className="cm-title">COMUNIDADES</h4>
      <div className="cm-search">
        <span>Buscar por nome ou endereço…</span>
        <i>⌕</i>
      </div>
      <div className="cm-filters">
        {FILTERS.map((f, i) => (
          <button key={f} type="button" className={i === filter ? 'is-on' : ''} onClick={() => setFilter(i)}>
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>
      <ul className="cm-grid" key={active}>
        {shown.map((c, i) => (
          <li key={c.name} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="cm-card-top">
              {c.img ? <img src={c.img} alt="" /> : null}
              <span className="cm-tag">{c.tag}</span>
              <span className="cm-ini">{initials(c.name)}</span>
            </div>
            <p>{c.name}</p>
            {c.place && <small>{c.place}</small>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeaderStage() {
  return (
    <div className="cm-stage">
      <div className="cm-cover">
        <span className="cm-cat">COMUNIDADE · NEGÓCIO</span>
        <span className="cm-lock">🔒 PRIVADA · PAGA</span>
      </div>
      <div className="cm-head">
        <img src="/portfolio/tech/freelandoo/enzo-cortes.webp" alt="" />
        <p>ENZO CORTES</p>
      </div>
      <ul className="cm-panels">
        <li>
          <b>👑 LÍDER</b>
          <span>cria, modera e define quem entra</span>
        </li>
        <li>
          <b>👥 MEMBROS</b>
          <span>participam do feed e da temporada</span>
        </li>
        <li>
          <b>🏆 TEMPORADA</b>
          <span>o ciclo da comunidade</span>
        </li>
        <li>
          <b>🛡 MODERAÇÃO</b>
          <span>o líder modera o que entra no feed</span>
        </li>
      </ul>
    </div>
  );
}

function PlatformStage() {
  const [tab, setTab] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTab((t) => (t + 1) % 2), 1600);
    return () => window.clearInterval(timer);
  }, []);
  const items = [
    { k: 'PET', all: 'Todos os pets', same: 'Mesma raça que o meu' },
    { k: 'CARRO', all: 'Todos os carros', same: 'Mesmo modelo que o meu' },
    { k: 'GAMES', all: 'Todo o feed de games', same: 'Mesmo jogo atual' },
  ];
  return (
    <div className="cm-stage">
      <h4 className="cm-title">PLATAFORMAS ABERTAS</h4>
      <ul className="cm-platforms">
        {items.map((item) => (
          <li key={item.k}>
            <b>{item.k}</b>
            <div className="cm-ptabs">
              <span className={tab === 0 ? 'is-on' : ''}>TODOS</span>
              <span className={tab === 1 ? 'is-on' : ''}>MESMO QUE O MEU</span>
            </div>
            <p key={tab}>{tab === 0 ? item.all : item.same}</p>
          </li>
        ))}
      </ul>
      <p className="cm-note">Feed público · sem membros · a aba recorta o mesmo feed</p>
    </div>
  );
}

function CondoStage() {
  return (
    <div className="cm-stage cm-stage--condo">
      <div className="cm-condo-cover">
        <span className="cm-condo-cat">CONDOMÍNIO</span>
      </div>
      <div className="cm-condo-head">
        <span className="cm-condo-ini">R</span>
        <p>RESIDENCIAL</p>
        <span className="cm-condo-only">SÓ MORADORES</span>
      </div>
      <div className="cm-condo-tabs">
        <span className="is-on">FEED</span>
        <span>SERVIÇOS</span>
        <span>PRODUTOS</span>
      </div>
      <div className="cm-condo-feed">
        <i />
        <i />
      </div>
    </div>
  );
}

function VitrineStage() {
  const filled = new Set([0, 3, 4, 8]);
  return (
    <div className="cm-stage cm-stage--condo">
      <h4 className="cm-condo-title">VITRINE ENTRE VIZINHOS</h4>
      <ul className="cm-vitrine">
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i} className={filled.has(i) ? 'is-filled' : ''} style={{ animationDelay: `${i * 50}ms` }}>
            {filled.has(i) ? (
              <>
                <i aria-hidden="true" />
                <b>{i % 2 ? 'PRODUTO' : 'SERVIÇO'}</b>
                <span>anúncio de morador</span>
              </>
            ) : (
              <>
                <b>VAGO</b>
                <span>Alugue por 1 mês</span>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="cm-note cm-note--dark">12 lugares · cada vaga é alugada por um mês · lotou, abre mais uma fileira</p>
    </div>
  );
}

/** Comunidades e condomínios da Freelandoo no formato laboratório. */
export default function ComunidadesLab() {
  return (
    <ShowcaseLab
      theme="sl-theme-freelandoo"
      kicker="COMUNIDADES · CONDOMÍNIOS · FREELANDOO"
      title={
        <>
          Do negócio
          <br />
          ao prédio.
        </>
      }
      intro="Dois tipos de espaço na mesma plataforma: comunidades com líder (negócio, condomínio, bairro) e plataformas abertas (pet, carro, games, financeiro). O condomínio ganha pele própria e uma vitrine entre vizinhos."
      steps={STEPS}
      renderStage={(step) =>
        step === 'explorar' ? (
          <ExploreStage />
        ) : step === 'lider' ? (
          <LeaderStage />
        ) : step === 'plataformas' ? (
          <PlatformStage />
        ) : step === 'condominio' ? (
          <CondoStage />
        ) : (
          <VitrineStage />
        )
      }
      hudLeft="FREELANDOO.COM.BR/COMUNIDADES"
      aside={
        <div className="sl-chips">
          {['Next.js 16', 'Express 5', 'PostgreSQL', 'Socket.IO'].map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </div>
      }
    />
  );
}
