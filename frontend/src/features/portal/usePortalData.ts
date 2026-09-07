import { useCallback, useEffect, useState } from 'react';
import * as service from './portalService';
import type { PortalClient, PortalPayment, PortalProject } from './portalService';

export type PortalStatus = 'loading' | 'ready' | 'error';

export interface PortalData {
  status: PortalStatus;
  client: PortalClient | null;
  projects: PortalProject[];
  payments: PortalPayment[];
  refresh(): Promise<void>;
}

/**
 * Carrega, de uma vez, tudo que as telas do cliente mostram. São três GETs
 * pequenos e sempre usados juntos — separar em hooks por página só faria a
 * navegação piscar.
 */
export function usePortalData(): PortalData {
  const [status, setStatus] = useState<PortalStatus>('loading');
  const [client, setClient] = useState<PortalClient | null>(null);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [payments, setPayments] = useState<PortalPayment[]>([]);

  const load = useCallback(async () => {
    try {
      const [nextClient, nextProjects, nextPayments] = await Promise.all([
        service.fetchMyClient(),
        service.fetchMyProjects(),
        service.fetchMyPayments(),
      ]);
      setClient(nextClient);
      setProjects(nextProjects);
      setPayments(nextPayments);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, client, projects, payments, refresh: load };
}
