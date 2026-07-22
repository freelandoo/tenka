import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CampaignEnergy } from './stage';

/**
 * Estado global de baixa frequência: seleções do configurador de campanha,
 * canal ativo do portfólio e controle do modal de briefing. Valores lidos a
 * cada frame ficam em state/stage.ts.
 */
export interface CampaignConfig {
  objective: string | null;
  formats: string[];
  energy: CampaignEnergy | null;
  platforms: string[];
}

const EMPTY_CAMPAIGN: CampaignConfig = {
  objective: null,
  formats: [],
  energy: null,
  platforms: [],
};

interface StageState {
  campaign: CampaignConfig;
  setObjective: (value: string | null) => void;
  toggleFormat: (value: string) => void;
  setEnergy: (value: CampaignEnergy | null) => void;
  togglePlatform: (value: string) => void;
  clearCampaign: () => void;
  briefOpen: boolean;
  briefHasConfiguration: boolean;
  openBrief: (withConfiguration?: boolean) => void;
  closeBrief: () => void;
  activeChannel: number;
  setActiveChannel: (index: number) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const StageContext = createContext<StageState | null>(null);

export function StageProvider({ children }: { children: ReactNode }) {
  const [campaign, setCampaign] = useState<CampaignConfig>(EMPTY_CAMPAIGN);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefHasConfiguration, setBriefHasConfiguration] = useState(false);
  const [activeChannel, setActiveChannel] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const setObjective = useCallback(
    (value: string | null) => setCampaign((c) => ({ ...c, objective: value })),
    [],
  );
  const toggleFormat = useCallback(
    (value: string) =>
      setCampaign((c) => ({
        ...c,
        formats: c.formats.includes(value)
          ? c.formats.filter((f) => f !== value)
          : [...c.formats, value],
      })),
    [],
  );
  const setEnergy = useCallback(
    (value: CampaignEnergy | null) => setCampaign((c) => ({ ...c, energy: value })),
    [],
  );
  const togglePlatform = useCallback(
    (value: string) =>
      setCampaign((c) => ({
        ...c,
        platforms: c.platforms.includes(value)
          ? c.platforms.filter((p) => p !== value)
          : [...c.platforms, value],
      })),
    [],
  );
  const clearCampaign = useCallback(() => setCampaign(EMPTY_CAMPAIGN), []);

  const openBrief = useCallback((withConfiguration = false) => {
    setBriefHasConfiguration(withConfiguration);
    setBriefOpen(true);
  }, []);
  const closeBrief = useCallback(() => setBriefOpen(false), []);
  const toggleSound = useCallback(() => setSoundEnabled((s) => !s), []);

  const value = useMemo(
    () => ({
      campaign,
      setObjective,
      toggleFormat,
      setEnergy,
      togglePlatform,
      clearCampaign,
      briefOpen,
      briefHasConfiguration,
      openBrief,
      closeBrief,
      activeChannel,
      setActiveChannel,
      soundEnabled,
      toggleSound,
    }),
    [campaign, briefOpen, briefHasConfiguration, activeChannel, soundEnabled, setObjective, toggleFormat, setEnergy, togglePlatform, clearCampaign, openBrief, closeBrief, toggleSound],
  );

  return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
}

export function useStage(): StageState {
  const context = useContext(StageContext);
  if (!context) throw new Error('useStage must be used inside StageProvider');
  return context;
}
