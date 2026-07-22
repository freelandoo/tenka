import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { useGSAP } from '@gsap/react';
import { Play, Clapperboard } from 'lucide-react';
import { gsap } from '../lib/gsap';
import { CHANNELS, projectById } from '../data/projects';
import { MMX_SECTIONS } from '../data/campaign';
import { pulseReaction, setStagePalette, setStagePhase } from '../state/stage';
import { useStage } from '../state/StageContext';
import { MediaCard } from '../components/MediaCard';

export interface PortfolioSectionProps {
  reducedMotion: boolean;
}

/**
 * Portfólio como troca de canais de TV: cada canal tem paleta, ritmo e
 * formato próprios. A transição é corte seco com um sopro de estática —
 * nunca um fade longo.
 */
export function PortfolioSection({ reducedMotion }: PortfolioSectionProps) {
  const wrapRef = useRef<HTMLElement>(null);
  const { activeChannel, setActiveChannel } = useStage();
  const [backstage, setBackstage] = useState(false);
  const project = projectById(CHANNELS[activeChannel].projectId);
  // Os callbacks do ScrollTrigger (criados uma única vez) leem a paleta do
  // canal corrente por aqui — sem isso, aplicariam a paleta do primeiro render.
  const paletteRef = useRef(project.palette);
  paletteRef.current = project.palette;

  const switchChannel = useCallback(
    (index: number) => {
      if (index === activeChannel) return;
      const wrap = wrapRef.current;
      const screen = wrap?.querySelector<HTMLElement>('.mmx-ch-screen');
      const staticLayer = wrap?.querySelector<HTMLElement>('.mmx-channel-static');
      const apply = () => {
        setActiveChannel(index);
        setBackstage(false);
        setStagePalette(projectById(CHANNELS[index].projectId).palette);
        pulseReaction(0.4);
      };
      if (reducedMotion || !screen || !staticLayer) {
        apply();
        return;
      }
      // corte seco: estática rápida + deslocamento do quadro, troca no meio
      const tl = gsap.timeline();
      tl.set(staticLayer, { opacity: 0.35 })
        .to(screen, { x: -14, duration: 0.05 })
        .call(apply)
        .to(screen, { x: 10, duration: 0.05 })
        .set(staticLayer, { opacity: 0.15 })
        .to(screen, { x: 0, duration: 0.08 })
        .set(staticLayer, { opacity: 0 });
    },
    [activeChannel, reducedMotion, setActiveChannel],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      switchChannel((activeChannel + 1) % CHANNELS.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      switchChannel((activeChannel - 1 + CHANNELS.length) % CHANNELS.length);
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
          end: 'bottom 30%',
          onEnter: () => {
            setStagePhase('channel-surfing');
            setStagePalette(paletteRef.current);
          },
          onEnterBack: () => {
            setStagePhase('channel-surfing');
            setStagePalette(paletteRef.current);
          },
          onLeave: () => setStagePalette(null),
          onLeaveBack: () => setStagePalette(null),
        },
      });
    },
    // A paleta corrente é lida no enter; não precisa reanexar por canal.
    { scope: wrapRef, dependencies: [] },
  );

  const [dom, sup, acc] = project.palette;
  const channelVars = { '--ch-dom': dom, '--ch-sup': sup, '--ch-acc': acc } as CSSProperties;

  return (
    <section
      ref={wrapRef}
      id={MMX_SECTIONS.portfolio}
      className="relative py-28 lg:py-36"
      aria-label="Portfólio — escolha o que você quer assistir"
      style={channelVars}
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <h2 className="mmx-display text-[clamp(2.6rem,7vw,6.4rem)]">
          ESCOLHA O QUE
          <br />
          <span style={{ color: 'var(--ch-dom)' }}>VOCÊ QUER ASSISTIR.</span>
        </h2>

        {/* seletor de canais */}
        <div
          role="tablist"
          aria-label="Canais do portfólio"
          onKeyDown={onKeyDown}
          className="mmx-scroll-x mt-10 flex gap-2 pb-2"
        >
          {CHANNELS.map((channel, i) => {
            const isActive = i === activeChannel;
            return (
              <button
                key={channel.number}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="mmx-channel-panel"
                tabIndex={isActive ? 0 : -1}
                data-cursor="TROCAR"
                onClick={() => switchChannel(i)}
                className="mmx-cond shrink-0 border-2 px-5 py-3 text-[15px] tracking-[0.06em] transition-colors"
                style={
                  isActive
                    ? { borderColor: 'var(--ch-dom)', background: 'var(--ch-dom)', color: 'var(--mmx-white)' }
                    : { borderColor: 'var(--mmx-border)', color: 'var(--mmx-text-2)' }
                }
              >
                CH {channel.number} — {channel.name}
              </button>
            );
          })}
        </div>

        {/* tela do canal */}
        <div
          id="mmx-channel-panel"
          role="tabpanel"
          aria-label={`Canal ${CHANNELS[activeChannel].number} — ${project.title}`}
          className="relative mt-6 overflow-hidden border-2"
          style={{ borderColor: 'var(--ch-dom)' }}
        >
          <div className="mmx-ch-screen relative grid min-h-[480px] lg:grid-cols-[minmax(0,55%)_minmax(0,1fr)]">
            {/* área de mídia do canal */}
            <div className="relative min-h-[300px] overflow-hidden" style={{ background: 'var(--ch-sup)' }}>
              <ChannelScene channelIndex={activeChannel} backstage={backstage} />
              <span className="mmx-onair absolute left-4 top-4 z-10" style={{ color: 'var(--ch-acc)' }}>
                CH {CHANNELS[activeChannel].number} // NO AR
              </span>
              <span className="mmx-timecode absolute bottom-4 right-4 z-10 text-white/70">
                {project.typographyStyle.toUpperCase()} CUT
              </span>
            </div>

            {/* ficha do projeto */}
            <div className="relative flex flex-col justify-between gap-8 bg-[var(--mmx-bg-2)]/80 p-7 lg:p-10">
              <div>
                <p className="mmx-mono text-[10px] tracking-[0.3em]" style={{ color: 'var(--ch-acc)' }}>
                  {project.category.toUpperCase()}
                </p>
                <h3 className={`mt-3 text-[clamp(2.2rem,4.6vw,4rem)] leading-none ${project.typographyStyle === 'display' ? 'mmx-display' : project.typographyStyle === 'cond' ? 'mmx-cond' : 'mmx-stamp'}`}>
                  {project.title}
                </h3>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--mmx-text-2)]">{project.concept}</p>

                <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2">
                  <InfoRow label="FORMATO" value={project.format} />
                  <InfoRow label="PLATAFORMAS" value={project.platforms.join(' + ')} />
                  <InfoRow label="PÚBLICO" value={project.audience} />
                  {project.results && <InfoRow label="RESULTADO" value={project.results[0]} />}
                </dl>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  data-cursor="ASSISTIR"
                  className="mmx-btn mmx-btn-primary"
                  style={{ background: 'var(--ch-dom)' }}
                  onClick={() => { setBackstage(false); pulseReaction(0.5); }}
                >
                  <Play size={15} fill="currentColor" /> ASSISTIR PROJETO
                </button>
                <button
                  type="button"
                  data-cursor="VER BASTIDORES"
                  aria-pressed={backstage}
                  className="mmx-btn mmx-btn-ghost"
                  onClick={() => setBackstage((b) => !b)}
                >
                  <Clapperboard size={15} /> VER BASTIDORES
                </button>
              </div>
            </div>
          </div>
          <div className="mmx-channel-static" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mmx-mono text-[9px] tracking-[0.3em] text-[var(--mmx-text-mute)]">{label}</dt>
      <dd className="mt-0.5 leading-snug text-[var(--mmx-white)]/90">{value}</dd>
    </div>
  );
}

/** Cena de mídia por canal — cada canal tem densidade e formato próprios. */
function ChannelScene({ channelIndex, backstage }: { channelIndex: number; backstage: boolean }) {
  const project = projectById(CHANNELS[channelIndex].projectId);

  if (backstage) {
    return (
      <div className="absolute inset-0 flex flex-col justify-center gap-3 p-8" style={{ background: 'var(--ch-sup)' }}>
        <p className="mmx-mono text-[10px] tracking-[0.35em]" style={{ color: 'var(--ch-acc)' }}>
          BASTIDORES // PRODUÇÃO
        </p>
        <ul className="space-y-2">
          {project.production.map((item, i) => (
            <li key={item} className="flex items-center gap-3 text-[15px] text-white/90">
              <span className="mmx-mono text-[10px]" style={{ color: 'var(--ch-acc)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {item}
            </li>
          ))}
        </ul>
        {project.results?.[1] && <p className="mt-2 max-w-sm text-[13px] text-white/60">{project.results[1]}</p>}
      </div>
    );
  }

  const name = CHANNELS[channelIndex].name;
  return (
    <div className="absolute inset-0" aria-hidden="true">
      {name === 'SOCIAL' && (
        <div className="flex h-full items-center justify-center gap-4 p-6">
          {project.images.map((img, i) => (
            <MediaCard key={img} seed={img} variant="story" palette={project.palette} className={i === 1 ? 'w-[34%]' : 'w-[26%] opacity-70'} style={{ aspectRatio: '9 / 16', fontSize: 10, transform: `rotate(${(i - 1) * 3}deg)` }} label={i === 1 ? 'REEL 01' : undefined} />
          ))}
        </div>
      )}
      {name === 'CAMPANHA' && (
        <div className="relative flex h-full items-center justify-center p-6">
          <MediaCard seed={project.images[0]} variant="photo" palette={project.palette} className="w-[80%]" style={{ aspectRatio: '16 / 9', fontSize: 14 }} />
          <p className="mmx-display absolute bottom-[12%] left-[10%] text-[clamp(1.8rem,3.4vw,3rem)] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
            DEPOIS DO EXPEDIENTE.
          </p>
        </div>
      )}
      {name === 'VÍDEO' && (
        <div className="flex h-full flex-col justify-center gap-3 p-6">
          <MediaCard seed={project.images[0]} variant="video" palette={project.palette} className="w-full" style={{ aspectRatio: '21 / 9', fontSize: 13 }} />
          <div className="flex h-8 items-end gap-[2px] opacity-80">
            {Array.from({ length: 64 }, (_, i) => (
              <span key={i} className="w-1 flex-1" style={{ height: `${18 + ((i * 53) % 82)}%`, background: 'var(--ch-acc)' }} />
            ))}
          </div>
        </div>
      )}
      {name === 'IDENTIDADE' && (
        <div className="grid h-full grid-cols-3 gap-3 p-6">
          <div className="mmx-stamp col-span-3 flex items-center justify-center text-[clamp(2rem,4vw,3.4rem)]" style={{ color: 'var(--ch-acc)' }}>
            NEW SIGNAL®
          </div>
          {project.images.map((img, i) => (
            <MediaCard key={img} seed={img} variant="poster" palette={project.palette} style={{ aspectRatio: '3 / 4', fontSize: 8, transform: `rotate(${(i - 1) * 2}deg)` }} />
          ))}
        </div>
      )}
      {name === 'ENTRETENIMENTO' && (
        <div className="relative flex h-full flex-col justify-center gap-3 p-6">
          <MediaCard seed={project.images[0]} variant="video" palette={project.palette} className="w-full" style={{ aspectRatio: '16 / 8', fontSize: 13 }} label="EPISÓDIO AO VIVO" />
          <div className="flex gap-2">
            {['VOTAÇÃO ABERTA', 'PLACAR 58/42', 'PLATEIA 12.4K'].map((tag) => (
              <span key={tag} className="mmx-mono bg-black/50 px-2 py-1 text-[9px] tracking-[0.2em]" style={{ color: 'var(--ch-acc)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
