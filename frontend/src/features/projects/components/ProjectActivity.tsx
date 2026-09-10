import { useEffect, useState } from 'react';
import type {
  ProfileRow,
  ProjectActivityRow,
  ProjectStatus,
} from '../../../lib/supabase/database.types';
import * as service from '../services/projectsService';
import { formatCurrencyFromCents, formatDate, formatDateTime } from '../../panel/format';
import { COLUMN_LABELS } from '../hooks/useKanban';

interface ProjectActivityListProps {
  projectId: string;
  profiles: ProfileRow[];
  revision?: number;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;

function projectChanges(meta: Record<string, unknown>): string {
  if (!Array.isArray(meta.changes)) return 'os dados do projeto';
  const labels: Record<string, string> = {
    name: 'nome', description: 'descrição', value_cents: 'valor total', due_date: 'data de entrega',
    client_name: 'cliente', company: 'empresa', color_key: 'cor',
  };
  return meta.changes.map((raw) => {
    const item = asRecord(raw);
    if (!item) return '';
    const label = labels[String(item.field)] ?? String(item.field);
    if (item.field === 'value_cents') return `${label} de ${formatCurrencyFromCents(Number(item.from))} para ${formatCurrencyFromCents(Number(item.to))}`;
    if (item.field === 'due_date') return `${label} de ${formatDate(String(item.from))} para ${formatDate(String(item.to))}`;
    return `${label} de “${String(item.from ?? '—')}” para “${String(item.to ?? '—')}”`;
  }).filter(Boolean).join('; ') || 'os dados do projeto';
}

function statusLabel(value: unknown): string {
  return typeof value === 'string' && value in COLUMN_LABELS
    ? COLUMN_LABELS[value as ProjectStatus]
    : String(value ?? '');
}

function describe(activity: ProjectActivityRow, actorName: string, profiles: ProfileRow[]): string {
  const meta = activity.metadata ?? {};
  const targetName = (userId: unknown) =>
    profiles.find((p) => p.id === userId)?.name ?? 'um usuário';

  switch (activity.action) {
    case 'projeto_criado':
      return `${actorName} criou o projeto.`;
    case 'projeto_editado':
      return `${actorName} alterou ${projectChanges(meta)}.`;
    case 'responsavel_adicionado':
      return `${actorName} adicionou ${targetName(meta.user_id)} como responsável.`;
    case 'responsavel_removido':
      return `${actorName} removeu ${targetName(meta.user_id)} dos responsáveis.`;
    case 'status_alterado':
      return `${actorName} moveu de ${statusLabel(meta.from)} para ${statusLabel(meta.to)}.`;
    case 'posicao_alterada':
      return `${actorName} reordenou o projeto na coluna ${statusLabel(meta.status)}.`;
    case 'observacao_adicionada':
      return `${actorName} adicionou uma observação.`;
    case 'observacao_editada':
      return `${actorName} editou uma observação.`;
    case 'projeto_finalizado':
      return `${actorName} finalizou o projeto.`;
    case 'projeto_reaberto':
      return `${actorName} reabriu o projeto.`;
    case 'projeto_arquivado':
      return `${actorName} arquivou o projeto.`;
    case 'assinatura_configurada': {
      const previous = asRecord(meta.previous);
      const current = asRecord(meta.current);
      if (meta.event === 'pause') return `${actorName} solicitou a desativação da mensalidade.`;
      if (meta.event === 'reactivate') return `${actorName} solicitou a reativação da mensalidade.`;
      if (!current && meta.initial) return `${actorName} configurou a mensalidade em ${formatCurrencyFromCents(Number(meta.amountCents))}, vencimento no dia ${meta.dueDay}.`;
      if (!current) return `${actorName} atualizou a mensalidade.`;
      const before = previous ? `${formatCurrencyFromCents(Number(previous.amountCents))}, dia ${previous.dueDay}` : 'não configurada';
      const after = `${formatCurrencyFromCents(Number(current.amountCents))}, dia ${current.dueDay}, próximo vencimento ${formatDate(String(current.nextDueDate))}`;
      return `${actorName} alterou a mensalidade de ${before} para ${after}.`;
    }
    case 'plano_pagamentos_atualizado':
      return `${actorName} ${meta.status === 'active' ? 'ativou' : 'salvou'} o plano de pagamentos com ${Array.isArray(meta.current) ? meta.current.length : 0} etapa(s), total de ${formatCurrencyFromCents(Number(meta.totalCents))}.`;
    case 'pagamento_projeto_atualizado':
      return `${actorName} alterou “${String(meta.paymentName ?? 'pagamento')}” de ${String(meta.from ?? '—')} para ${String(meta.to ?? '—')}.`;
    case 'pagamento_baixa_local':
      return `${actorName} registrou na Tenka o pagamento de “${String(meta.paymentName ?? 'pagamento')}”`
        + `${meta.amountCents ? ` no valor de ${formatCurrencyFromCents(Number(meta.amountCents))}` : ''}`
        + `${meta.paymentDate ? ` em ${formatDate(String(meta.paymentDate))}` : ''}. Nenhuma cobrança do Asaas foi alterada.`;
    // A baixa manual é feita no Asaas com uma chave de API única — só esta
    // linha diz qual pessoa apertou o botão.
    case 'pagamento_baixa_manual': {
      const alvo = meta.scope === 'mensalidade'
        ? `a mensalidade de ${String(meta.competence ?? '—')}`
        : `“${String(meta.paymentName ?? 'pagamento')}”`;
      return `${actorName} registrou pagamento por fora de ${alvo} no valor de `
        + `${formatCurrencyFromCents(Number(meta.amountCents))}, recebido em `
        + `${formatDate(String(meta.paymentDate))}. Aguardando confirmação do Asaas.`;
    }
    case 'notificacao_pagamento_solicitada':
      return `${actorName} solicitou ao Asaas a baixa e a notificação de pagamento ao cliente. Este registro confirma a solicitação, não a entrega individual de SMS ou e-mail.`;
    case 'cobranca_cancelada':
      return `${actorName} cancelou no Asaas ${meta.scope === 'mensalidade' ? 'uma cobrança mensal' : `“${String(meta.paymentName ?? 'uma cobrança')}”`}`
        + `${meta.reason ? `; motivo: ${String(meta.reason)}` : ''}.`;
    case 'cobranca_asaas_evento': {
      const labels: Record<string, string> = {
        PAYMENT_CREATED: 'criou a cobrança',
        PAYMENT_UPDATED: 'atualizou a cobrança',
        PAYMENT_CONFIRMED: 'confirmou o pagamento',
        PAYMENT_RECEIVED: 'confirmou o recebimento',
        PAYMENT_OVERDUE: 'marcou a cobrança como vencida',
        PAYMENT_VIEWED: 'registrou que a cobrança foi visualizada',
        PAYMENT_BANK_SLIP_VIEWED: 'registrou que o boleto foi visualizado',
        PAYMENT_DELETED: 'confirmou o cancelamento da cobrança',
        PAYMENT_RECEIVED_IN_CASH_UNDONE: 'desfez a baixa manual',
      };
      return `Asaas ${labels[String(meta.eventType)] ?? `enviou o evento ${String(meta.eventType ?? 'financeiro')}`}.`;
    }
    case 'cobrancas_encerradas_por_arquivamento': {
      const noAsaas = Number(meta.requestedAtProvider ?? meta.cancelledAtProvider ?? 0);
      const mensais = Number(meta.requestedMonthlyAtProvider ?? 0);
      const locais = Number(meta.cancelledLocally ?? 0);
      const partes = [
        noAsaas > 0 ? `cancelamento de ${noAsaas} cobrança(s) solicitado ao Asaas` : '',
        mensais > 0 ? `cancelamento de ${mensais} mensalidade(s) solicitado ao Asaas` : '',
        locais > 0 ? `${locais} pagamento(s) encerrado(s) na Tenka` : '',
      ].filter(Boolean).join(' e ');
      return `${actorName} solicitou o arquivamento do projeto: ${partes || 'nenhuma cobrança em aberto'}.`;
    }
    default:
      return `${actorName} atualizou o projeto.`;
  }
}

/** Trilha de atividades do projeto (carregamento controlado, mais recentes primeiro). */
export function ProjectActivityList({ projectId, profiles, revision = 0 }: ProjectActivityListProps) {
  const [items, setItems] = useState<ProjectActivityRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setFailed(false);
    service
      .fetchActivity(projectId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, revision]);

  if (items === null) {
    return <p style={{ fontSize: 13, color: 'var(--panel-text-faint)' }}>Carregando histórico…</p>;
  }
  if (failed) {
    return <p style={{ fontSize: 13, color: '#ff8a87' }}>Falha ao carregar o histórico.</p>;
  }
  if (items.length === 0) {
    return (
      <p style={{ fontSize: 13.5, color: 'var(--panel-text-faint)' }}>
        Nenhuma atividade registrada ainda.
      </p>
    );
  }

  return (
    <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((activity) => {
        const actorName =
          profiles.find((p) => p.id === activity.actor_id)?.name ?? 'Sistema';
        return (
          <li key={activity.id} className="activity-item">
            <span className="activity-item__dot" aria-hidden="true" />
            <div>
              {describe(activity, actorName, profiles)}
              <time dateTime={activity.created_at}>{formatDateTime(activity.created_at)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
