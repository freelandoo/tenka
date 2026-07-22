import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { Trash2, Send } from 'lucide-react';
import { gsap } from '../lib/gsap';
import { ENERGIES, ENERGY_PROFILES, FORMATS, MMX_SECTIONS, OBJECTIVES, PLATFORMS } from '../data/campaign';
import { pulseReaction, setStageEnergy, setStagePhase, type CampaignEnergy } from '../state/stage';
import { useStage } from '../state/StageContext';
import { MediaCard } from '../components/MediaCard';

export interface CampaignBuilderSectionProps {
  reducedMotion: boolean;
}

/**
 * Configurador de campanha: objetivo, formatos, energia e plataformas. A
 * energia escolhida reconfigura a prévia e o palco imediatamente.
 */
export function CampaignBuilderSection({ reducedMotion }: CampaignBuilderSectionProps) {
  const wrapRef = useRef<HTMLElement>(null);
  const { campaign, setObjective, toggleFormat, setEnergy, togglePlatform, clearCampaign, openBrief } = useStage();
  const profile = campaign.energy ? ENERGY_PROFILES[campaign.energy] : null;

  const pickEnergy = (id: CampaignEnergy) => {
    const next = campaign.energy === id ? null : id;
    setEnergy(next);
    setStageEnergy(next);
    pulseReaction(0.5);
    if (!reducedMotion && next) {
      const preview = wrapRef.current?.querySelector('.mmx-builder-preview');
      if (preview) {
        gsap.fromTo(preview, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: 'expo.out' });
      }
    }
  };

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: 'top 60%',
          onEnter: () => setStagePhase('campaign-expansion'),
          onEnterBack: () => setStagePhase('campaign-expansion'),
        },
      });
    },
    { scope: wrapRef, dependencies: [] },
  );

  const hasSelection = Boolean(campaign.objective || campaign.formats.length || campaign.energy || campaign.platforms.length);
  const paceLabel = { hard: 'CORTE SECO', slow: 'CÂMERA LENTA', bouncy: 'RITMO SALTADO', calm: 'MOVIMENTO CONTIDO', loud: 'ALTO VOLUME', odd: 'FORA DO ESQUADRO' } as const;

  return (
    <section
      ref={wrapRef}
      id={MMX_SECTIONS.builder}
      className="relative py-28 lg:py-36"
      aria-label="Monte sua campanha"
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <h2 className="mmx-display text-[clamp(2.6rem,7vw,6rem)]">
          QUAL É A SUA PRÓXIMA
          <br />
          <span className="text-[var(--mmx-red)]">GRANDE IDEIA?</span>
        </h2>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,40%)]">
          <div className="space-y-10">
            <BuilderStep number="01" title="OBJETIVO">
              {OBJECTIVES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="mmx-chip"
                  data-active={campaign.objective === item}
                  aria-pressed={campaign.objective === item}
                  onClick={() => { setObjective(campaign.objective === item ? null : item); pulseReaction(0.25); }}
                >
                  {item}
                </button>
              ))}
            </BuilderStep>

            <BuilderStep number="02" title="FORMATOS">
              {FORMATS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="mmx-chip"
                  data-active={campaign.formats.includes(item)}
                  aria-pressed={campaign.formats.includes(item)}
                  onClick={() => { toggleFormat(item); pulseReaction(0.2); }}
                >
                  {item}
                </button>
              ))}
            </BuilderStep>

            <BuilderStep number="03" title="ENERGIA">
              {ENERGIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="mmx-chip"
                  data-active={campaign.energy === item.id}
                  aria-pressed={campaign.energy === item.id}
                  onClick={() => pickEnergy(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </BuilderStep>

            <BuilderStep number="04" title="PLATAFORMAS">
              {PLATFORMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="mmx-chip"
                  data-active={campaign.platforms.includes(item)}
                  aria-pressed={campaign.platforms.includes(item)}
                  onClick={() => { togglePlatform(item); pulseReaction(0.2); }}
                >
                  {item}
                </button>
              ))}
            </BuilderStep>
          </div>

          {/* prévia viva da campanha */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="mmx-builder-preview relative overflow-hidden border-2 border-[var(--mmx-border)] will-change-transform"
              style={{ transform: profile ? `rotate(${profile.tilt * 0.4}deg)` : undefined }}
            >
              <div className="relative" style={{ aspectRatio: '4 / 5' }}>
                <MediaCard
                  seed={`campaign-${campaign.energy ?? 'base'}`}
                  variant={profile?.pace === 'slow' ? 'photo' : 'poster'}
                  palette={profile?.palette}
                  className="absolute inset-0"
                  style={{ fontSize: 15 }}
                />
                <div className="absolute inset-0 flex flex-col justify-between p-5" style={{ background: 'linear-gradient(to top, rgba(5,2,3,0.8), transparent 50%)' }}>
                  <span className="mmx-onair w-fit text-[var(--mmx-yellow)]">CAMPANHA EM PRODUÇÃO</span>
                  <p className={`text-[clamp(1.8rem,3vw,2.6rem)] leading-[0.95] text-white ${profile?.pace === 'calm' ? 'mmx-stamp' : 'mmx-display'}`}>
                    {profile?.headline ?? 'SUA IDEIA AQUI.'}
                  </p>
                </div>
              </div>

              {/* resumo ao vivo */}
              <dl className="mmx-mono space-y-1.5 border-t-2 border-[var(--mmx-border)] bg-[var(--mmx-bg-2)] p-5 text-[10px] tracking-[0.22em]" aria-live="polite">
                <SummaryRow label="OBJETIVO" value={campaign.objective?.toUpperCase() ?? '—'} />
                <SummaryRow label="FORMATOS" value={campaign.formats.length ? campaign.formats.map((f) => f.toUpperCase()).join(' + ') : '—'} />
                <SummaryRow label="ENERGIA" value={campaign.energy ? campaign.energy.toUpperCase() : '—'} />
                <SummaryRow label="PLATAFORMAS" value={campaign.platforms.length ? campaign.platforms.map((p) => p.toUpperCase()).join(' + ') : '—'} />
                {profile && <SummaryRow label="DIREÇÃO" value={`${profile.note} // ${paceLabel[profile.pace]}`} accent />}
              </dl>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="mmx-btn mmx-btn-ghost"
                disabled={!hasSelection}
                style={!hasSelection ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                onClick={() => { clearCampaign(); setStageEnergy(null); }}
              >
                <Trash2 size={15} /> LIMPAR CAMPANHA
              </button>
              <button type="button" data-cursor="CRIAR" className="mmx-btn mmx-btn-primary" onClick={() => openBrief(true)}>
                <Send size={15} /> ENVIAR ESTA IDEIA PARA A TENKA
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BuilderStep({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-4 flex items-baseline gap-3">
        <span className="mmx-progress-digits text-[1.6rem] text-[var(--mmx-red)]">{number}</span>
        <span className="mmx-cond text-[1.4rem] tracking-[0.08em] text-[var(--mmx-white)]">{title}</span>
      </legend>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </fieldset>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-[var(--mmx-text-mute)]">{label}</dt>
      <dd className={accent ? 'text-[var(--mmx-yellow)]' : 'text-[var(--mmx-white)]'}>{value}</dd>
    </div>
  );
}
