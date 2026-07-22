import { useEffect, useState } from 'react';

export type DeviceTier = 'high' | 'mid' | 'low';

export interface DeviceCapability {
  tier: DeviceTier;
  isTouch: boolean;
  /** Pointer is a mouse/trackpad — enables custom cursor + hover choreography. */
  hasFinePointer: boolean;
}

function detect(): DeviceCapability {
  if (typeof window === 'undefined') {
    return { tier: 'mid', isTouch: false, hasFinePointer: true };
  }

  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const smallScreen = window.innerWidth < 768;

  let tier: DeviceTier = 'high';
  if (isTouch || smallScreen || cores <= 4 || memory <= 4) tier = 'mid';
  if ((isTouch && cores <= 4) || memory <= 2) tier = 'low';

  // Embedded in the home showroom iframe: another WebGL scene is already
  // running on the page, so this instance runs lean.
  if (window.self !== window.top) tier = 'low';

  return { tier, isTouch, hasFinePointer };
}

export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>(detect);

  useEffect(() => {
    // Re-evaluate on orientation/em big resize only; capability rarely changes.
    const onResize = () => setCapability(detect());
    window.addEventListener('orientationchange', onResize);
    return () => window.removeEventListener('orientationchange', onResize);
  }, []);

  return capability;
}
