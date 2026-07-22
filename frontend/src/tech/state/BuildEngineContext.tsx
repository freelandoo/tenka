import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ProductType } from '../lib/constants';

/**
 * Low-frequency global state: what the visitor selected (product type,
 * builder modules) and briefing modal control. High-frequency values live in
 * state/engine.ts, never here.
 */
interface BuildEngineState {
  productType: ProductType;
  setProductType: (type: ProductType) => void;
  /** Module ids selected in the "Build your product" section. */
  builderModules: string[];
  toggleBuilderModule: (id: string) => void;
  clearBuilderModules: () => void;
  briefOpen: boolean;
  openBrief: (withConfiguration?: boolean) => void;
  closeBrief: () => void;
  /** True when the brief was opened from the builder with a configuration. */
  briefHasConfiguration: boolean;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  canvasFocus: string | null;
  setCanvasFocus: (id: string | null) => void;
  interfaceStage: 'wire' | 'ui' | 'live';
  setInterfaceStage: (stage: 'wire' | 'ui' | 'live') => void;
}

const BuildEngineContext = createContext<BuildEngineState | null>(null);

export function BuildEngineProvider({ children }: { children: ReactNode }) {
  const [productType, setProductType] = useState<ProductType>('site');
  const [builderModules, setBuilderModules] = useState<string[]>([]);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefHasConfiguration, setBriefHasConfiguration] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('gym-control');
  const [canvasFocus, setCanvasFocus] = useState<string | null>(null);
  const [interfaceStage, setInterfaceStage] = useState<'wire' | 'ui' | 'live'>('wire');

  const toggleBuilderModule = useCallback((id: string) => {
    setBuilderModules((current) =>
      current.includes(id) ? current.filter((m) => m !== id) : [...current, id],
    );
    // Shared event system: the animated background listens and pulses the
    // matching processing-matrix region.
    window.dispatchEvent(new CustomEvent('tenka-module-activate', { detail: { module: id } }));
  }, []);

  const clearBuilderModules = useCallback(() => setBuilderModules([]), []);

  const openBrief = useCallback((withConfiguration = false) => {
    setBriefHasConfiguration(withConfiguration);
    setBriefOpen(true);
  }, []);

  const closeBrief = useCallback(() => setBriefOpen(false), []);

  const value = useMemo(
    () => ({
      productType,
      setProductType,
      builderModules,
      toggleBuilderModule,
      clearBuilderModules,
      briefOpen,
      openBrief,
      closeBrief,
      briefHasConfiguration,
      selectedProjectId,
      setSelectedProjectId,
      canvasFocus,
      setCanvasFocus,
      interfaceStage,
      setInterfaceStage,
    }),
    [productType, builderModules, briefOpen, briefHasConfiguration, selectedProjectId, canvasFocus, interfaceStage, toggleBuilderModule, clearBuilderModules, openBrief, closeBrief],
  );

  return <BuildEngineContext.Provider value={value}>{children}</BuildEngineContext.Provider>;
}

export function useBuildEngine(): BuildEngineState {
  const context = useContext(BuildEngineContext);
  if (!context) throw new Error('useBuildEngine must be used inside BuildEngineProvider');
  return context;
}
