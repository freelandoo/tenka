/**
 * O back diz se o checkout está ligado (`payments`) e o que dá para comprar.
 * Até a resposta chegar — ou se ela falhar — a loja fica no modo WhatsApp:
 * nunca mostrar botão de pagar que pode quebrar depois do clique.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchCatalogStatus, type CatalogStatus } from './api';

const OFF: CatalogStatus = { payments: false, purchasable: new Set() };
const StatusContext = createContext<CatalogStatus>(OFF);

export function StoreStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CatalogStatus>(OFF);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchCatalogStatus(ctrl.signal)
      .then(setStatus)
      .catch(() => {});
    return () => ctrl.abort();
  }, []);
  return <StatusContext.Provider value={status}>{children}</StatusContext.Provider>;
}

export function useStoreStatus(): CatalogStatus {
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
