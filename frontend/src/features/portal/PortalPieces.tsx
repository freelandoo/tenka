import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ProjectStatus } from '../../lib/supabase/database.types';

/** Peças compartilhadas pelas três telas do portal do cliente. */

export const PORTAL_STATUS_LABELS: Record<ProjectStatus, string> = {
  inicio: 'Em início',
  em_andamento: 'Em andamento',
  finalizado: 'Concluído',
};

export function PortalHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header style={{ marginBottom: 22 }}>
      <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
        {eyebrow}
      </p>
      <h1 style={{ fontSize: 23, fontWeight: 700 }}>{title}</h1>
      {description && (
        <p
          style={{
            fontSize: 13.5,
            color: 'var(--panel-text-dim)',
            marginTop: 6,
            maxWidth: 620,
            lineHeight: 1.55,
          }}
        >
          {description}
        </p>
      )}
    </header>
  );
}

export function PortalLoading() {
  return (
    <div className="panel-session-loading" role="status" aria-live="polite">
      <span className="panel-session-loading__pulse" aria-hidden="true" />
      <p>Carregando sua conta…</p>
    </div>
  );
}

export function PortalError({ onRetry }: { onRetry(): void }) {
  return (
    <div className="panel-empty">
      <p>Não foi possível carregar os dados da sua conta.</p>
      <button type="button" className="panel-btn" onClick={onRetry}>
        <RefreshCw size={15} aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="panel-stat">
      <p className="panel-stat__label">{label}</p>
      <p className="panel-stat__value">{value}</p>
      {hint && <p className="panel-stat__hint">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`panel-badge panel-badge--${status}`}>{PORTAL_STATUS_LABELS[status]}</span>
  );
}
