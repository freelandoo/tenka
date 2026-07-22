import { type RefObject } from 'react';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { stepFabric, fabricSmooth } from './lib/smooth';
import { fabric } from './lib/fabric';
import { statusForPhase } from './config/backgroundPhases';

/**
 * Runs once per frame BEFORE every scene component (priority -100): advances
 * the smoothed fabric channels, updates the DOM status readout and the
 * velocity darkener behind content during fast deployment movement.
 */
export function FabricDriver({
  statusRef,
  dimRef,
}: {
  statusRef: RefObject<HTMLElement | null>;
  dimRef: RefObject<HTMLElement | null>;
}) {
  const lastStatus = useRef('');
  const lastDim = useRef(-1);

  useFrame((_, delta) => {
    stepFabric(delta);

    const label = statusForPhase(fabric.phase);
    if (statusRef.current && label !== lastStatus.current) {
      lastStatus.current = label;
      statusRef.current.textContent = label;
    }

    if (dimRef.current) {
      const cfg = fabricSmooth.config;
      // Steady scrim while big structures are on screen + extra darkening
      // during fast deployment movement.
      const dim = Math.min(
        0.5,
        (cfg.panelPresence + cfg.matrixIntensity) * 0.14 +
          cfg.deploymentProgress * Math.min(1, Math.abs(fabricSmooth.velocity)) * 0.5,
      );
      if (Math.abs(dim - lastDim.current) > 0.01) {
        lastDim.current = dim;
        dimRef.current.style.opacity = dim.toFixed(3);
      }
    }
  }, -100);

  return null;
}
