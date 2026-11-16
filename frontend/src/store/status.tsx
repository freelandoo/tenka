/**
 * O back diz se o checkout está ligado (`payments`) e o que dá para comprar.
 * Até a resposta chegar — ou se ela falhar — a loja fica no modo WhatsApp:
 * nunca mostrar botão de pagar que pode quebrar depois do clique.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchCatalogStatus, type CatalogStatus } from './api';
import { registerCustomProducts } from './catalog';

type StoreStatus = CatalogStatus & {
  /** Relê o catálogo sem cache (depois de o admin cadastrar ou editar). */
  reload: () => Promise<void>;
};

const OFF: CatalogStatus = { payments: false, purchasable: new Set(), custom: [] };
const StatusContext = createContext<StoreStatus>({ ...OFF, reload: async () => {} });

export function StoreStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CatalogStatus>(OFF);
  const apply = useCallback((s: CatalogStatus) => {
    // Registra ANTES do setState: carrinho e gaveta leem o registro no render.
    registerCustomProducts(s.custom);
    setStatus(s);
  }, []);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchCatalogStatus(ctrl.signal)
      .then(apply)
      .catch(() => {});
    return () => ctrl.abort();
  }, [apply]);
  const reload = useCallback(async () => {
    apply(await fetchCatalogStatus(undefined, true));
  }, [apply]);
  const value = useMemo(() => ({ ...status, reload }), [status, reload]);
  return <StatusContext.Provider value={value}>{children}</StatusContext.Provider>;
}

export function useStoreStatus(): StoreStatus {
  return useContext(StatusContext);
}

export function useCanBuy(slug: string): boolean {
  const s = useStoreStatus();
  return s.payments && s.purchasable.has(slug);
}

// --------------------------------------------- gaveta do carrinho (aberta?)

let open = false;
const listeners = new Set<() => void>();
export const cartDrawer = {
  get: () => open,
  set(value: boolean) {
    open = value;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
