import type { WorldProject } from '../data/projects';

export interface ProjectMediaProps {
  project: WorldProject;
  /** Compact controls sizing for the mobile carousel. */
  compact?: boolean;
}

/**
 * Cinematic placeholder key-art for a world. Layered so it reads as intentional
 * art direction, not a flat rectangle: a diagonal base gradient, a radial
 * horizon light in the world's glow colour, film grain, scanlines, and the
 * technical badges. Swaps cleanly for real media (image/video) later.
 */
export function ProjectMedia({ project, compact = false }: ProjectMediaProps) {
  const pad = compact ? 'p-3' : 'p-4';
  return (
    <div
      className="relative aspect-video w-full overflow-hidden border border-white/10 bg-black"
      role="img"
      aria-label={project.image.alt}
    >
      {/* Base diagonal gradient */}
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{ background: `linear-gradient(135deg, ${project.image.from}, ${project.image.to})` }}
      />
      {/* Radial horizon light */}
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 60% 105%, ${project.image.glow}55, transparent 60%)`,
        }}
      />
      {/* Monolith silhouettes — abstract structures on the horizon */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            'linear-gradient(90deg, transparent 12%, rgba(0,0,0,0.55) 18%, transparent 22%, transparent 46%, rgba(0,0,0,0.6) 52%, transparent 58%, transparent 78%, rgba(0,0,0,0.5) 84%, transparent 90%)',
          maskImage: 'linear-gradient(to top, black 40%, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent)',
        }}
      />
      <div className="wf-grain absolute inset-0" aria-hidden="true" />
      <div className="wf-scanlines absolute inset-0" aria-hidden="true" />
      {/* Vignette for contrast under the badges */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5))' }}
      />

      <div className={`absolute inset-0 flex flex-col justify-between ${pad}`}>
        <div className="flex items-start justify-between">
          <span
            className="wf-mono border px-2 py-1 text-[10px] tracking-[0.2em]"
            style={{ borderColor: `${project.accent}80`, color: project.accent }}
          >
            {project.status}
          </span>
          <span className="wf-mono text-[10px] tracking-[0.2em] text-white/70">{project.year}</span>
        </div>
        {!compact && (
          <div>
            <p className="wf-mono text-[10px] tracking-[0.3em] text-white/60">
              {project.category.toUpperCase()}
            </p>
            <p
              className="wf-display text-2xl font-bold"
              style={{ color: '#fff', textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
            >
              {project.title}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
