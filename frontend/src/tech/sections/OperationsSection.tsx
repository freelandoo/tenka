import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { setCanvasMode } from '../state/engine';
import { useBuildEngine } from '../state/BuildEngineContext';

const SERVICES = [
  { name: 'API PRINCIPAL', detail: 'sa-east-1 / 18 instâncias', latency: '42 ms' },
  { name: 'BANCO DE DADOS', detail: 'réplica sincronizada', latency: '11 ms' },
  { name: 'FILA DE EVENTOS', detail: '6 workers ativos', latency: '27 ms' },
  { name: 'CDN GLOBAL', detail: '38 pontos de presença', latency: '19 ms' },
];

const SCENARIOS = [
  { id: 'traffic', label: 'PICO DE ACESSOS', focus: 'api', latency: 7 },
  { id: 'payment', label: 'PAGAMENTO', focus: 'database', latency: 2 },
  { id: 'incident', label: 'FALHA ISOLADA', focus: 'notifications', latency: 16 },
];

export function OperationsSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [tick, setTick] = useState(0);
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const { setCanvasFocus } = useBuildEngine();
  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0];

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 2200);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  useGSAP(() => {
    ScrollTrigger.create({ trigger: sectionRef.current, start: 'top 62%', onEnter: () => setCanvasMode('online') });
    gsap.from('.tbe-op-row', {
      autoAlpha: 0,
      x: reducedMotion ? 0 : 24,
      stagger: reducedMotion ? 0 : 0.08,
      duration: reducedMotion ? 0.1 : 0.55,
      scrollTrigger: { trigger: sectionRef.current, start: 'top 76%' },
    });
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  return (
    <section id={TBE_SECTIONS.operations} ref={sectionRef} className="relative py-32" aria-label="Operação e evolução contínua">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <div>
          <p className="tbe-mono mb-4 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">DEPOIS DO DEPLOY</p>
          <h2 className="tbe-display text-[clamp(2rem,5vw,3.8rem)] font-bold leading-[1.03]">PRODUTOS DIGITAIS<br />CONTINUAM VIVOS.</h2>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-[var(--tbe-text)]/80">
            Monitoramos estabilidade, comportamento e desempenho para transformar uso real em ciclos objetivos de evolução.
          </p>
          <dl className="tbe-mono mt-12 grid grid-cols-2 gap-px border border-[#0b1b33]/10 bg-[#0b1b33]/10">
            {[
              ['UPTIME / 30D', '99,94%'],
              ['DEPLOYS / MÊS', '18'],
              ['EVENTOS / DIA', `${(284 + tick * 3).toLocaleString('pt-BR')}k`],
              ['INCIDENTES', '00'],
            ].map(([label, value]) => (
              <div key={label} className="bg-[var(--tbe-bg)] p-5">
                <dt className="text-[9px] tracking-[0.22em] text-[var(--tbe-text-mute)]">{label}</dt>
                <dd className="mt-2 text-xl text-[var(--tbe-text)]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="self-end">
          <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Cenários de operação">
            {SCENARIOS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={scenarioId === item.id} onClick={() => { setScenarioId(item.id); setCanvasFocus(item.focus); }} className={`tbe-mono min-h-[40px] border px-3 py-2 text-[9px] tracking-[0.16em] transition-colors active:translate-y-px ${scenarioId === item.id ? 'border-[var(--tbe-tq)] bg-[var(--tbe-tq)]/10 text-[var(--tbe-text)]' : 'border-[#0b1b33]/10 text-[var(--tbe-text-mute)]'}`}>{item.label}</button>)}
          </div>
          <div className="border-y border-[#0b1b33]/10" role="region" aria-label="Painel de saúde dos serviços em produção">
          <div className="flex items-center justify-between border-b border-[#0b1b33]/10 py-3">
            <span className="tbe-mono text-[10px] tracking-[0.25em] text-[var(--tbe-text-2)]">PRODUCTION // HEALTH</span>
            <span className="tbe-mono flex items-center gap-2 text-[9px] tracking-[0.2em] text-[var(--tbe-success)]"><span className="tbe-status-dot" /> TODOS OS SISTEMAS OPERACIONAIS</span>
          </div>
          {SERVICES.map((service, index) => (
            <div key={service.name} className="tbe-op-row grid grid-cols-[1fr_auto] gap-6 border-b border-[#0b1b33]/[0.07] py-5 last:border-0 sm:grid-cols-[1fr_1fr_auto]">
              <div><p className="tbe-mono text-[11px] tracking-[0.18em]">{service.name}</p><p className="mt-1 text-xs text-[var(--tbe-text-mute)] sm:hidden">{service.detail}</p></div>
              <p className="hidden text-sm text-[var(--tbe-text-2)] sm:block">{service.detail}</p>
              <p className="tbe-mono text-[10px] text-[var(--tbe-tq)]">{index === SCENARIOS.findIndex((item) => item.id === scenarioId) ? `${Number.parseInt(service.latency) + scenario.latency} ms` : service.latency}</p>
            </div>
          ))}
          <div className="tbe-mono flex justify-between py-3 text-[9px] tracking-[0.18em] text-[var(--tbe-text-mute)]">
            <span>ÚLTIMA VERIFICAÇÃO: AGORA</span><span>AUTO-REFRESH ATIVO</span>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
