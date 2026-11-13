/**
 * O canvas único da loja: fixo na viewport, sem eventos (o hover vem do DOM do
 * card), e cada `<View>` dos cards é desenhado dentro dele.
 */

import { useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { View } from '@react-three/drei';
import { isCaptureMode } from '../media';
import { storeClock } from '../models';

/**
 * Captura do vídeo do celular: o relógio passa a ser manual e quem grava
 * (Playwright) avança quadro a quadro com `__storeSetTime(t)`. Assim o vídeo
 * sai liso mesmo que o print demore mais que 1/30 s.
 */
function CaptureBridge() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    storeClock.manual = true;
    const w = window as Window & { __storeSetTime?: (t: number) => void };
    w.__storeSetTime = (t: number) => {
      storeClock.t = t;
      invalidate();
    };
    return () => {
      storeClock.manual = false;
      delete w.__storeSetTime;
    };
  }, [invalidate]);
  return null;
}

/**
 * Com `preserveDrawingBuffer` (exigido para o print da captura) o navegador
 * para de limpar o canvas entre quadros e os Views deixam rastro. Prioridade 0
 * roda antes dos Views (prioridade ≥ 1) e limpa a tela inteira.
 */
function ClearEachFrame() {
  useFrame(({ gl }) => {
    gl.setScissorTest(false);
    gl.clear(true, true, true);
  }, 0);
  return null;
}

export default function StoreCanvas() {
  const capture = isCaptureMode();
  return (
    <Canvas
      className="lj-canvas"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 2 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: capture }}
      frameloop={capture ? 'demand' : 'always'}
      aria-hidden="true"
    >
      <View.Port />
      {capture && <CaptureBridge />}
      {capture && <ClearEachFrame />}
    </Canvas>
  );
}
