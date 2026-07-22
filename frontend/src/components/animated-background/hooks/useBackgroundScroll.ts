import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../../../tech/lib/gsap';
import { SECTION_PHASE_MAP, type SectionPhaseRange } from '../config/backgroundPhases';
import { fabric, pulseFabric } from '../lib/fabric';

/*
 * Links the Digital Fabric to page scroll. Each existing section owns a
 * scrubbed range of the phase scalar; consecutive sections share boundary
 * values, so the scalar is continuous and reverses exactly when scrolling up.
 *
 * Uses the section's viewport-center crossing (top center -> bottom center):
 * adjacent sections hand over at the same scroll position, and pinned
 * sections (the Build Canvas pins several) are accounted for by ScrollTrigger
 * on refresh. Only the active trigger may write, so refresh-order renders of
 * inactive ranges never clobber the current value.
 */
export function useBackgroundScroll(
  reducedMotion: boolean,
  onSectionChange: (entry: SectionPhaseRange) => void,
): void {
  useGSAP(() => {
    const created: ScrollTrigger[] = [];

    // Master trigger: page progress + clamped velocity for secondary effects.
    created.push(
      ScrollTrigger.create({
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          fabric.scroll = self.progress;
          fabric.velocity = Math.max(-1, Math.min(1, self.getVelocity() / 3200));
        },
      }),
    );

    for (const entry of SECTION_PHASE_MAP) {
      const element = document.getElementById(entry.section);
      if (!element) continue;

      if (reducedMotion) {
        // Short crossfades between complete states — no scrubbing.
        created.push(
          ScrollTrigger.create({
            trigger: element,
            start: 'top 60%',
            end: 'bottom 60%',
            onEnter: () => {
              gsap.to(fabric, { phase: entry.to, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
              onSectionChange(entry);
            },
            onEnterBack: () => {
              gsap.to(fabric, { phase: entry.from, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
              onSectionChange(entry);
            },
          }),
        );
        continue;
      }

      created.push(
        ScrollTrigger.create({
          trigger: element,
          start: 'top center',
          end: 'bottom center',
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (!self.isActive && (self.progress === 0 || self.progress === 1)) return;
            fabric.phase = entry.from + self.progress * (entry.to - entry.from);
          },
          onToggle: (self) => {
            if (!self.isActive) return;
            onSectionChange(entry);
            // A restrained energy pulse travels the scene on section change.
            pulseFabric(0.55);
          },
        }),
      );
    }

    return () => created.forEach((trigger) => trigger.kill());
  }, { dependencies: [reducedMotion] });
}
