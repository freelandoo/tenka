import { useEffect, useState } from 'react';
import ShowcaseLab, { type ShowcaseStep } from '../../components/showcase/ShowcaseLab';
import { useGoogleFonts } from '../../hooks/useGoogleFonts';
import './coliseu-lab.css';

const CL = '/portfolio/tech/coliseu';

const STEPS: ShowcaseStep[] = [
  {
    id: 'captacao',
    label: '1 · Captação',
    title: 'Todo lead no mesmo quadro.',
    text: 'Leads de WhatsApp, redes, balcão e indicação entram num kanban por origem e são qualificados antes de virar matrícula.',
    ms: 6000,
  },
  {
    id: 'matricula',
    label: '2 · Matrícula',
    title: 'Plano, cadastro, pagamento.',
    text: 'A esteira da matrícula: o aluno escolhe o plano, faz o cadastro, recebe o link de pagamento do Asaas pelo WhatsApp e o webhook confirma sozinho.',
    ms: 6000,
  },
  {
    id: 'cobranca',
    label: '3 · Cobrança',
    title: 'Ninguém esquece o vencimento.',
    text: 'Avisos de vencimento, controle de inadimplência e renovação de planos a expirar — com o retorno do Asaas (pago, recebido, vencido) atualizando cada aluno.',
  },
  {
    id: 'retencao',
    label: '4 · Retenção',
    title: 'Sumiu? A academia percebe.',
    text: 'A presença é monitorada e quem some entra em faixas de reativação de 7, 14 e 21 dias, cada uma com a sua abordagem.',
  },
  {
    id: 'catraca',
    label: 'Catraca facial',
    title: 'O rosto abre a catraca.',
    text: 'Um agente local conversa com a catraca Control iD iDFace: busca comandos, executa e devolve cada giro para o sistema — que vira presença e alimenta a retenção.',
    ms: 6000,
  },
  {
    id: 'aluno',
    label: 'Painel do aluno',
    title: 'Do outro lado, o aluno.',
    text: 'Na Freelandoo, o aluno vincula a matrícula pelo CPF e acompanha frequência, treinos e calorias no painel fitness — integrado ao Coliseu.',
  },
];

const LEADS = [
  { col: 'WHATSAPP', items: ['Lead 0412', 'Lead 0415'] },
  { col: 'REDES', items: ['Lead 0408'] },
  { col: 'BALCÃO', items: ['Lead 0401', 'Lead 0410'] },
  { col: 'INDICAÇÃO', items: ['Lead 0399'] },
];

function Plate({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`cl-plate ${className}`}>{children}</div>;
}

function Header({ stage }: { stage: string }) {
  return (
    <div className="cl-header">
      <img src={`${CL}/logo.webp`} alt="" />
      <div>
        <p>SISTEMA COLISEU</p>
        <span>{stage}</span>
      </div>
      <em>DADOS ILUSTRATIVOS</em>
    </div>
  );
}

function CaptacaoStage() {
  return (
    <div className="cl-stage">
      <Header stage="ESTÁGIO 1 · CAPTAÇÃO" />
      <div className="cl-kanban">
        {LEADS.map((col, c) => (
          <Plate key={col.col}>
            <p className="cl-col">{col.col}</p>
            {col.items.map((lead, i) => (
              <div key={lead} className="cl-card" style={{ animationDelay: `${(c * 2 + i) * 140}ms` }}>
                <b>{lead}</b>
                <span>{i === 0 ? 'qualificado' : 'novo'}</span>
              </div>
            ))}
          </Plate>
        ))}
      </div>
      <div className="cl-funnel">
        {[100, 62, 41, 28].map((w, i) => (
          <i key={w} style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  );
}

function MatriculaStage() {
  const steps = ['Plano', 'Cadastro', 'Asaas', 'Link no WhatsApp', 'Webhook confirma'];
  const [at, setAt] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setAt((a) => (a + 1) % (steps.length + 1)), 900);
    return () => window.clearInterval(timer);
  }, [steps.length]);
  return (
    <div className="cl-stage">
      <Header stage="ESTÁGIO 2 · MATRÍCULA" />
      <div className="cl-plans">
        {['MENSAL', 'TRIMESTRAL', 'ANUAL'].map((plan, i) => (
          <Plate key={plan} className={i === 1 ? 'is-picked' : ''}>
            <p className="cl-plan">{plan}</p>
            <span>{i === 1 ? 'escolhido' : '—'}</span>
          </Plate>
        ))}
      </div>
      <ol className="cl-belt">
        {steps.map((s, i) => (
          <li key={s} className={i < at ? 'is-done' : i === at ? 'is-now' : ''}>
            <i>{i < at ? '✓' : i + 1}</i>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CobrancaStage() {
  const rows = [
    { who: 'Aluno 0231', st: 'PAGO', cls: 'ok' },
    { who: 'Aluno 0198', st: 'VENCE EM 3 DIAS', cls: 'warn' },
    { who: 'Aluno 0177', st: 'VENCIDO', cls: 'bad' },
    { who: 'Aluno 0164', st: 'RENOVAR PLANO', cls: 'info' },
  ];
  return (
    <div className="cl-stage">
      <Header stage="ESTÁGIO 3 · COBRANÇA" />
      <Plate className="cl-table">
        {rows.map((r, i) => (
          <div key={r.who} className="cl-row" style={{ animationDelay: `${i * 140}ms` }}>
            <b>{r.who}</b>
            <span className={`cl-pill cl-pill--${r.cls}`}>{r.st}</span>
            <em>{r.cls === 'bad' ? 'aviso no WhatsApp' : r.cls === 'warn' ? 'lembrete agendado' : r.cls === 'info' ? 'plano a expirar' : 'webhook Asaas'}</em>
          </div>
        ))}
      </Plate>
      <p className="cl-webhook">POST /api/webhooks/asaas · PAYMENT_CONFIRMED · PAYMENT_RECEIVED · PAYMENT_OVERDUE</p>
    </div>
  );
}

function RetencaoStage() {
  const buckets = [
    { d: '7', n: 12, tone: 'warn' },
    { d: '14', n: 7, tone: 'bad' },
    { d: '21', n: 4, tone: 'deep' },
  ];
  return (
    <div className="cl-stage">
      <Header stage="ESTÁGIO 4 · RETENÇÃO" />
      <div className="cl-buckets">
        {buckets.map((b, i) => (
          <Plate key={b.d} className={`cl-bucket cl-bucket--${b.tone}`}>
            <p>
              <b>{b.d}</b> DIAS
            </p>
            <span>sem aparecer</span>
            <div className="cl-dots">
              {Array.from({ length: b.n }, (_, k) => (
                <i key={k} style={{ animationDelay: `${i * 200 + k * 40}ms` }} />
              ))}
            </div>
            <em>reativar →</em>
          </Plate>
        ))}
      </div>
    </div>
  );
}

function CatracaStage() {
  const [events, setEvents] = useState<number[]>([0]);
  useEffect(() => {
    const timer = window.setInterval(() => setEvents((e) => [e[0] + 1, ...e].slice(0, 5)), 1300);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="cl-stage">
      <Header stage="ACESSO · CATRACA iDFACE" />
      <div className="cl-access">
        <Plate className="cl-face">
          <div className="cl-face-scan" aria-hidden="true">
            <i />
          </div>
          <p>RECONHECIMENTO FACIAL</p>
          <span>Control iD iDFace</span>
        </Plate>
        <Plate className="cl-feed">
          <p className="cl-col">GIROS EM TEMPO REAL</p>
          {events.map((id) => (
            <div key={id} className="cl-event">
              <span className="cl-pill cl-pill--ok">LIBERADO</span>
              <b>Aluno {String(200 + ((id * 37) % 90)).padStart(4, '0')}</b>
              <em>presença registrada</em>
            </div>
          ))}
        </Plate>
      </div>
      <p className="cl-webhook">agente → heartbeat → comandos → giro → AccessEvent → presença → retenção</p>
    </div>
  );
}

function AlunoStage() {
  return (
    <div className="cl-stage cl-stage--fit">
      <div className="cl-fit-head">
        <span>FITNESS · FREELANDOO</span>
        <p>ACADEMIAS</p>
        <small>Vincule sua matrícula pelo CPF e acompanhe frequência, treinos e calorias.</small>
      </div>
      <div className="cl-fit-cpf">
        <span>CPF</span>
        <b>•••.•••.•••-••</b>
        <em>VINCULAR</em>
      </div>
      <div className="cl-fit-stats">
        {[
          { k: 'FREQUÊNCIA', v: 'dias no mês' },
          { k: 'TREINOS', v: 'histórico' },
          { k: 'CALORIAS', v: 'gasto estimado' },
        ].map((s) => (
          <div key={s.k}>
            <b>{s.k}</b>
            <span>{s.v}</span>
            <i aria-hidden="true" />
          </div>
        ))}
      </div>
      <p className="cl-fit-note">Integração Coliseu (Gym Provider API)</p>
    </div>
  );
}

/** Sistema Coliseu (CRM de academia) no formato laboratório, no tema industrial do produto. */
export default function ColiseuLab() {
  useGoogleFonts('family=Oswald:wght@500;600;700&family=Sora:wght@400;600');
  const stages: Record<string, React.ReactNode> = {
    captacao: <CaptacaoStage />,
    matricula: <MatriculaStage />,
    cobranca: <CobrancaStage />,
    retencao: <RetencaoStage />,
    catraca: <CatracaStage />,
    aluno: <AlunoStage />,
  };
  return (
    <ShowcaseLab
      theme="sl-theme-coliseu"
      kicker="ACADEMIAS · SISTEMA COLISEU"
      title={
        <>
          Da captação
          <br />à catraca.
        </>
      }
      intro="O CRM da Academia Coliseu Team, em São Bernardo do Campo: captação, matrícula, cobrança e retenção num funil de quatro estágios, com Asaas, WhatsApp e catraca de reconhecimento facial."
      steps={STEPS}
      renderStage={(step) => stages[step]}
      hudLeft="COLISEU · SÃO BERNARDO DO CAMPO"
      aside={
        <>
          <div className="sl-chips">
            {['Next.js 16', 'React 19', 'GSAP', 'Asaas', 'Control iD', 'Railway'].map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
          <a className="sl-link" href="https://www.academiacoliseu.com.br" target="_blank" rel="noopener noreferrer">
            Ver o Coliseu ↗
          </a>
        </>
      }
      style={{ backgroundImage: `linear-gradient(90deg, rgba(14,15,17,0.97) 35%, rgba(14,15,17,0.85)), url(${CL}/hero.webp)`, backgroundSize: 'cover', backgroundPosition: 'right center' }}
    />
  );
}
