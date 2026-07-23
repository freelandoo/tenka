/**
 * Mock interface kit — the reusable primitives every "screen" on the page is
 * assembled from: the hero Build Canvas, the interface-construction stages,
 * portfolio product windows, the product-builder preview and the final
 * deployment devices. One kit → the whole page feels like one product.
 *
 * Everything renders in three fidelity stages:
 *   wire — grayscale wireframe blocks;
 *   ui   — structured components, neutral surfaces, accents on primary actions;
 *   live — realistic simulated content and active data.
 */

export type MockStage = 'wire' | 'ui' | 'live';

const WIRE = 'rgba(11,27,51,0.14)';
const WIRE_SOFT = 'rgba(11,27,51,0.07)';

interface StageProps {
  stage: MockStage;
  accent?: string;
}

/* — atoms — */

export function Bar({ w = '100%', h = 6, stage, accent }: StageProps & { w?: string | number; h?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        background: stage === 'wire' ? WIRE_SOFT : stage === 'ui' ? 'rgba(11,27,51,0.1)' : accent ? `${accent}26` : 'rgba(11,27,51,0.12)',
      }}
    />
  );
}

export function Btn({ stage, accent = '#1d6bff', label }: StageProps & { label?: string }) {
  if (stage === 'wire') return <div style={{ width: 64, height: 18, border: `1px dashed ${WIRE}` }} />;
  return (
    <div
      className="tbe-mono flex items-center justify-center text-[7px] tracking-[0.15em]"
      style={{
        width: 64,
        height: 18,
        background: stage === 'live' ? accent : 'transparent',
        border: `1px solid ${accent}`,
        color: stage === 'live' ? '#041012' : accent,
      }}
    >
      {stage === 'live' ? (label ?? 'AÇÃO') : ''}
    </div>
  );
}

export function Metric({ stage, accent = '#1d6bff', label, value, delta }: StageProps & { label: string; value: string; delta?: string }) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col gap-1 p-2"
      style={{ border: `1px solid ${stage === 'wire' ? WIRE : 'rgba(11,27,51,0.09)'}` }}
    >
      {stage === 'wire' ? (
        <>
          <div style={{ width: '55%', height: 4, background: WIRE_SOFT }} />
          <div style={{ width: '40%', height: 9, background: WIRE }} />
        </>
      ) : (
        <>
          <span className="tbe-mono truncate text-[6px] uppercase tracking-[0.15em]" style={{ color: 'rgba(11,27,51,0.4)' }}>
            {label}
          </span>
          <span className="tbe-display text-[11px] font-bold leading-none" style={{ color: '#F1F8F7' }}>
            {stage === 'live' ? value : '—'}
          </span>
          {stage === 'live' && delta && (
            <span className="tbe-mono text-[6px]" style={{ color: accent }}>
              {delta}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function ChartBars({ stage, accent = '#1d6bff', values = [34, 58, 42, 70, 52, 84, 66] }: StageProps & { values?: number[] }) {
  return (
    <div className="flex h-full w-full items-end gap-[3px]">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1"
          style={{
            height: `${v}%`,
            background:
              stage === 'wire' ? WIRE_SOFT : stage === 'live' && i === values.length - 2 ? accent : `${accent}44`,
            border: stage === 'wire' ? `1px solid ${WIRE}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export function ChartLine({ stage, accent = '#1d6bff' }: StageProps) {
  const d = 'M0,34 L14,28 L28,30 L42,20 L56,24 L70,12 L84,16 L100,6';
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
      {stage === 'live' && (
        <path d={`${d} L100,40 L0,40 Z`} fill={`${accent}18`} stroke="none" />
      )}
      <path
        d={d}
        fill="none"
        stroke={stage === 'wire' ? WIRE : accent}
        strokeWidth={stage === 'wire' ? 1 : 1.5}
        strokeDasharray={stage === 'wire' ? '3 3' : 'none'}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function TableRows({ stage, accent = '#1d6bff', rows = 4, labels }: StageProps & { rows?: number; labels?: string[] }) {
  return (
    <div className="flex w-full flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 py-[3px]"
          style={{ borderBottom: `1px solid ${stage === 'wire' ? WIRE_SOFT : 'rgba(11,27,51,0.06)'}` }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              background: stage === 'wire' ? WIRE_SOFT : `${accent}55`,
              borderRadius: stage === 'wire' ? 0 : 999,
            }}
          />
          {stage === 'live' && labels?.[i] ? (
            <span className="truncate text-[7px]" style={{ color: 'rgba(11,27,51,0.75)' }}>
              {labels[i]}
            </span>
          ) : (
            <div style={{ width: `${68 - i * 9}%`, height: 4, background: stage === 'wire' ? WIRE_SOFT : 'rgba(11,27,51,0.14)' }} />
          )}
          <div className="ml-auto" style={{ width: 18, height: 4, background: stage === 'wire' ? WIRE_SOFT : `${accent}44` }} />
        </div>
      ))}
    </div>
  );
}

/* — device frames — */

export function BrowserFrame({ children, url = 'tenka.com.br' }: { children: React.ReactNode; url?: string }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden border border-[#0b1b33]/12 bg-[#eef4fc]">
      <div className="flex h-[7%] min-h-[16px] shrink-0 items-center gap-1.5 border-b border-[#0b1b33]/10 bg-[#0b1b33]/[0.05] px-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#0b1b33]/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#0b1b33]/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#0b1b33]/20" />
        <span className="tbe-mono ml-2 truncate text-[6px] tracking-[0.1em] text-[var(--tbe-text)]/35">{url}</span>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-full w-full flex-col overflow-hidden border border-[#0b1b33]/15 bg-[#eef4fc]" style={{ borderRadius: 10, maxWidth: '52%' }}>
      <div className="flex h-[5%] min-h-[10px] shrink-0 items-center justify-center">
        <span className="h-[3px] w-8 rounded-full bg-[#0b1b33]/20" />
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

/* — compositions: the three product types — */

export function MockSite({ stage, accent = '#1d6bff' }: StageProps) {
  return (
    <div className="flex h-full w-full flex-col gap-2 p-2.5">
      {/* nav */}
      <div className="flex items-center justify-between">
        <div style={{ width: 34, height: 7, background: stage === 'wire' ? WIRE : accent }} />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 18, height: 4, background: stage === 'wire' ? WIRE_SOFT : 'rgba(11,27,51,0.25)' }} />
          ))}
          <Btn stage={stage} accent={accent} label="CONTATO" />
        </div>
      </div>
      {/* hero */}
      <div className="flex flex-1 flex-col justify-center gap-1.5" style={{ borderBottom: `1px solid ${stage === 'wire' ? WIRE_SOFT : 'rgba(11,27,51,0.07)'}` }}>
        {stage === 'live' ? (
          <p className="tbe-display text-[13px] font-bold leading-tight text-[var(--tbe-text)]">
            Construído para <span style={{ color: accent }}>converter.</span>
          </p>
        ) : (
          <>
            <Bar stage={stage} w="62%" h={10} accent={accent} />
            <Bar stage={stage} w="44%" h={10} accent={accent} />
          </>
        )}
        <Bar stage={stage} w="52%" h={4} />
        <div className="mt-1 flex gap-2">
          <Btn stage={stage} accent={accent} label="COMEÇAR" />
          <div style={{ width: 64, height: 18, border: `1px solid ${stage === 'wire' ? WIRE : 'rgba(11,27,51,0.2)'}` }} />
        </div>
      </div>
      {/* content cards */}
      <div className="grid shrink-0 grid-cols-3 gap-2" style={{ height: '26%' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1 p-1.5" style={{ border: `1px solid ${stage === 'wire' ? WIRE : 'rgba(11,27,51,0.08)'}` }}>
            <div style={{ width: 10, height: 10, background: stage === 'wire' ? WIRE_SOFT : `${accent}55` }} />
            <Bar stage={stage} w="80%" h={4} />
            <Bar stage={stage} w="60%" h={3} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockApp({ stage, accent = '#1d6bff' }: StageProps) {
  return (
    <div className="flex h-full w-full flex-col gap-1.5 p-2">
      {/* header */}
      <div className="flex items-center justify-between">
        <Bar stage={stage} w={30} h={6} accent={accent} />
        <div style={{ width: 10, height: 10, borderRadius: 999, background: stage === 'wire' ? WIRE : `${accent}66` }} />
      </div>
      {/* feed cards */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-1 flex-col justify-between gap-1 p-1.5" style={{ border: `1px solid ${stage === 'wire' ? WIRE : 'rgba(11,27,51,0.09)'}` }}>
            <div className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, borderRadius: 999, background: stage === 'wire' ? WIRE_SOFT : `${accent}88` }} />
              {stage === 'live' ? (
                <span className="text-[6.5px] text-[var(--tbe-text)]/70">{i === 0 ? 'Novo agendamento confirmado' : 'Pagamento recebido'}</span>
              ) : (
                <Bar stage={stage} w="55%" h={4} />
              )}
            </div>
            <Bar stage={stage} w="85%" h={3} />
            {i === 0 && <Btn stage={stage} accent={accent} label="ABRIR" />}
          </div>
        ))}
      </div>
      {/* tab bar */}
      <div className="flex shrink-0 items-center justify-around border-t pt-1.5" style={{ borderColor: stage === 'wire' ? WIRE_SOFT : 'rgba(11,27,51,0.1)' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 9,
              height: 9,
              background: stage !== 'wire' && i === 0 ? accent : stage === 'wire' ? WIRE_SOFT : 'rgba(11,27,51,0.22)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function MockDashboard({ stage, accent = '#1d6bff', rows, chart = 'bars' }: StageProps & { rows?: string[]; chart?: 'bars' | 'line' }) {
  return (
    <div className="flex h-full w-full gap-2 p-2">
      {/* sidebar */}
      <div className="flex w-[16%] shrink-0 flex-col gap-1.5 border-r pr-1.5" style={{ borderColor: stage === 'wire' ? WIRE_SOFT : 'rgba(11,27,51,0.08)' }}>
        <div style={{ width: '70%', height: 6, background: stage === 'wire' ? WIRE : accent }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: '100%',
              height: 5,
              background: stage !== 'wire' && i === 0 ? `${accent}44` : WIRE_SOFT,
              borderLeft: stage !== 'wire' && i === 0 ? `2px solid ${accent}` : 'none',
            }}
          />
        ))}
      </div>
      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex gap-1.5">
          <Metric stage={stage} accent={accent} label="Receita" value="R$ 48,2k" delta="+12%" />
          <Metric stage={stage} accent={accent} label="Usuários" value="1.842" delta="+6%" />
          <Metric stage={stage} accent={accent} label="Conversão" value="4,8%" delta="+0,4" />
        </div>
        <div className="min-h-0 flex-1 p-1.5" style={{ border: `1px solid ${stage === 'wire' ? WIRE : 'rgba(11,27,51,0.08)'}` }}>
          {chart === 'bars' ? <ChartBars stage={stage} accent={accent} /> : <ChartLine stage={stage} accent={accent} />}
        </div>
        <div className="max-h-[34%] shrink-0 overflow-hidden">
          <TableRows stage={stage} accent={accent} rows={3} labels={rows ?? ['Ana Duarte — plano anual', 'Carlos Mota — renovação', 'Equipe Vega — 12 acessos']} />
        </div>
      </div>
    </div>
  );
}

/* — extra panels used by the product builder preview — */

export function MockLogin({ stage, accent = '#1d6bff' }: StageProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-2">
      <div style={{ width: 16, height: 16, background: stage === 'wire' ? WIRE : accent }} />
      <Bar stage={stage} w="70%" h={10} />
      <Bar stage={stage} w="70%" h={10} />
      <Btn stage={stage} accent={accent} label="ENTRAR" />
    </div>
  );
}

export function MockChat({ stage, accent = '#1d6bff' }: StageProps) {
  return (
    <div className="flex h-full w-full flex-col justify-end gap-1 p-2">
      <div className="self-start" style={{ width: '58%', height: 10, background: 'rgba(11,27,51,0.1)' }} />
      <div className="self-end" style={{ width: '48%', height: 10, background: stage === 'wire' ? WIRE : `${accent}55` }} />
      <div className="self-start" style={{ width: '40%', height: 10, background: 'rgba(11,27,51,0.1)' }} />
      <div className="mt-1 flex items-center gap-1 border-t pt-1" style={{ borderColor: 'rgba(11,27,51,0.1)' }}>
        <div className="flex-1" style={{ height: 8, border: `1px solid ${stage === 'wire' ? WIRE : 'rgba(11,27,51,0.15)'}` }} />
        <div style={{ width: 8, height: 8, background: stage === 'wire' ? WIRE : accent }} />
      </div>
    </div>
  );
}
