import { useEffect, useState } from 'react';
import ShowcaseLab, { type ShowcaseStep } from '../../components/showcase/ShowcaseLab';
import './iw-live-lab.css';

const STEPS: ShowcaseStep[] = [
  {
    id: 'ao-vivo',
    label: 'Ao vivo',
    title: 'Não é gravação.',
    text: 'É o site da Innovation Week rodando nesta janela: rótulo 3D, partículas, portal e o astronauta, renderizados agora no seu navegador.',
    ms: 8000,
  },
  {
    id: 'qr',
    label: 'QR único',
    title: 'Uma URL, uma unidade.',
    text: 'O QR impresso é um link no padrão GS1: 01 é o produto, 10 o lote e 21 a unidade. A página lê os três e reconhece aquela embalagem específica.',
    ms: 6000,
  },
  {
    id: 'api',
    label: 'API',
    title: 'Saúde medida agora.',
    text: 'A API (Hono + PostgreSQL) responde pela mesma origem da TENKA. O health check é real e a latência é medida no seu navegador, a cada 5 segundos.',
  },
  {
    id: 'ranking',
    label: 'Ranking',
    title: 'O placar do evento.',
    text: 'Os recordes do Astronaut Jetpack vêm do servidor, que sorteia a semente da partida e confere se a distância é possível no tempo jogado.',
  },
];

function LiveStage() {
  return (
    <div className="iwv-stage iwv-stage--live">
      <div className="iwv-chrome">
        <i />
        <i />
        <i />
        <span>tenkagroup.com.br/innovation-week</span>
        <b>AO VIVO</b>
      </div>
      <iframe src="/innovation-week" title="Innovation Week rodando ao vivo" loading="lazy" />
    </div>
  );
}

const SAMPLE = '/innovation-week/01/1845678901001/10/l1/21/AO';

function QrStage() {
  const parts = [
    { ai: '01', label: 'PRODUTO', value: '1845678901001' },
    { ai: '10', label: 'LOTE', value: 'l1' },
    { ai: '21', label: 'UNIDADE', value: 'AO' },
  ];
  return (
    <div className="iwv-stage">
      <p className="iwv-label">QR IMPRESSO → URL</p>
      <p className="iwv-url">
        tenkagroup.com.br
        <span>/innovation-week</span>
        {parts.map((p) => (
          <span key={p.ai} className="iwv-seg">
            /<b>{p.ai}</b>/{p.value}
          </span>
        ))}
      </p>
      <ol className="iwv-parts">
        {parts.map((p, i) => (
          <li key={p.ai} style={{ animationDelay: `${400 + i * 350}ms` }}>
            <b>{p.ai}</b>
            <span>{p.label}</span>
            <em>{p.value}</em>
          </li>
        ))}
      </ol>
      <p className="iwv-label iwv-foot">IDENTIDADE // RECONHECIDA</p>
      <a className="iwv-try" href={SAMPLE}>
        Abrir esta unidade ↗
      </a>
    </div>
  );
}

function ApiStage() {
  const [pings, setPings] = useState<{ ok: boolean; ms: number }[]>([]);
  const [db, setDb] = useState<string>('');
  useEffect(() => {
    let alive = true;
    const ping = async () => {
      const start = performance.now();
      try {
        const r = await fetch('/innovation-week/api/health', { cache: 'no-store' });
        const body = (await r.json()) as { ok?: boolean; db?: string };
        if (!alive) return;
        setDb(body.db ?? '');
        setPings((p) => [...p, { ok: r.ok && !!body.ok, ms: Math.round(performance.now() - start) }].slice(-12));
      } catch {
        if (alive) setPings((p) => [...p, { ok: false, ms: 0 }].slice(-12));
      }
    };
    void ping();
    const timer = window.setInterval(ping, 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);
  const last = pings[pings.length - 1];
  const max = Math.max(200, ...pings.map((p) => p.ms));
  return (
    <div className="iwv-stage">
      <p className="iwv-label">GET /innovation-week/api/health</p>
      <p className={`iwv-status ${last ? (last.ok ? 'is-ok' : 'is-down') : ''}`}>
        {last ? (last.ok ? '200 OK' : 'INDISPONÍVEL') : 'MEDINDO…'}
      </p>
      <dl className="iwv-kv">
        <div>
          <dt>banco</dt>
          <dd>{db || '—'}</dd>
        </div>
        <div>
          <dt>latência</dt>
          <dd>{last ? `${last.ms} ms` : '—'}</dd>
        </div>
        <div>
          <dt>rota</dt>
          <dd>Vercel → Railway</dd>
        </div>
      </dl>
      <div className="iwv-bars" aria-hidden="true">
        {pings.map((p, i) => (
          <i key={i} className={p.ok ? '' : 'is-down'} style={{ height: `${Math.max(6, (p.ms / max) * 100)}%` }} />
        ))}
      </div>
    </div>
  );
}

function RankingStage() {
  const [top, setTop] = useState<{ total: number; top: { crew: number; name: string; best: number }[] } | null>(null);
  useEffect(() => {
    fetch('/innovation-week/api/game/top?limit=5')
      .then((r) => (r.ok ? r.json() : null))
      .then(setTop)
      .catch(() => {});
  }, []);
  return (
    <div className="iwv-stage">
      <p className="iwv-label">RANKING AO VIVO · ASTRONAUT JETPACK</p>
      {top?.top.length ? (
        <ol className="iwv-rank">
          {top.top.map((e, i) => (
            <li key={e.crew} style={{ animationDelay: `${i * 120}ms` }}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <b>{e.name}</b>
              <em>TRIPULANTE #{e.crew}</em>
              <strong>{e.best} m</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="iwv-empty">O ranking aparece aqui assim que o evento registrar voos.</p>
      )}
      {top && <p className="iwv-label iwv-foot">{top.total} TRIPULANTES NO RANKING</p>}
    </div>
  );
}

/** Innovation Week ao vivo no formato laboratório, no tema da IW. */
export default function IwLiveLab() {
  return (
    <ShowcaseLab
      theme="sl-theme-iw"
      kicker="EMBALAGEM INTELIGENTE · INNOVATION WEEK"
      title={
        <>
          Rodando
          <br />
          <em>agora.</em>
        </>
      }
      intro="QR único por unidade, rótulo 3D, realidade aumentada, cadastro com área do membro, jogo com ranking validado no servidor e telão do evento — o produto inteiro, ao vivo."
      steps={STEPS}
      renderStage={(step) =>
        step === 'ao-vivo' ? <LiveStage /> : step === 'qr' ? <QrStage /> : step === 'api' ? <ApiStage /> : <RankingStage />
      }
      hudLeft="TENKAGROUP.COM.BR/INNOVATION-WEEK"
      aside={
        <>
          <div className="sl-chips">
            {['Vite', 'TypeScript', 'three.js', 'MindAR', 'Hono', 'PostgreSQL'].map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
          <a className="sl-link" href="/innovation-week">
            Abrir a experiência ↗
          </a>
        </>
      }
    />
  );
}
