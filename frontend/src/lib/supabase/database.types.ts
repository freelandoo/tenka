/**
 * Tipos do banco do Painel TENKA — espelham `supabase/migrations/*.sql`.
 * Mantidos à mão (o projeto não usa o gerador de tipos do Supabase); se o
 * schema mudar, atualize aqui e nas migrations em conjunto.
 */

export type PanelRole = 'admin' | 'collaborator';

export type ProjectStatus = 'inicio' | 'em_andamento' | 'finalizado';

export type CompanyKey = 'tenka' | 'pjcodeworks';

export type PostItColorKey =
  | 'amarelo'
  | 'azul'
  | 'verde'
  | 'rosa'
  | 'laranja'
  | 'roxo'
  | 'ciano'
  | 'coral';

export interface ProfileRow {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: PanelRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  description: string;
  value_cents: number;
  /** Mensalidade recorrente (centavos). Soma na carteira enquanto ativa. */
  monthly_fee_cents: number;
  /** Cobrança recorrente ligada — a mensalidade só conta quando true. */
  subscription_active: boolean;
  /**
   * Cliente dono do projeto (migration 0014). `null` só em projeto sem contato
   * nenhum — o backfill não inventa cliente.
   */
  client_id: string | null;
  /**
   * Espelho dos dados do cliente, mantido pelo trigger `clients_sync_projects`.
   * Continua existindo porque o botão Aprovação do WhatsApp resolve o destino
   * por `client_phone`. Para EDITAR, use o cliente — aqui é cópia.
   */
  client_name: string;
  client_phone: string;
  client_email: string;
  /** Dia do mês do vencimento da cobrança (1–31). `null` = sem vencimento. */
  due_day: number | null;
  /** Empresa do grupo dona do projeto. */
  company: CompanyKey;
  due_date: string;
  status: ProjectStatus;
  color_key: PostItColorKey;
  position: number;
  /** Finalizado → sai do board para o histórico (≠ arquivado). */
  finalized_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/** Linhas da grade de diárias: o dia é planejado em cima e executado embaixo. */
export type DailyRowKey = 'planejamento' | 'execucao';

export interface DailyTaskRow {
  id: string;
  title: string;
  description: string;
  color_key: PostItColorKey;
  /** Dia da grade em ISO `YYYY-MM-DD` (coluna `date`, sem fuso). */
  day: string;
  row_key: DailyRowKey;
  position: number;
  /** Vínculo opcional com um projeto do Kanban. */
  project_id: string | null;
  /**
   * Quem vai executar. O formulário exige, mas a coluna aceita null: excluir
   * um perfil não pode apagar o registro do trabalho já feito.
   */
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAssigneeRow {
  project_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

/**
 * Canal por onde a observação saiu. `registro` fica só no painel; os outros três
 * são os botões do post-it e disparam WhatsApp.
 */
export type NoteChannel = 'registro' | 'interna' | 'aprovacao' | 'reuniao';

/** Destinos possíveis de um envio, como aparecem em `delivery`. */
export type NoteTarget = 'interna' | 'aprovacao';

export interface NoteDeliveryOutcome {
  ok: boolean;
  conversationId?: string;
  error?: string;
}

/**
 * Observação = registro imutável de mensagem. Não há edição: o backend recusa
 * UPDATE em `body`/`channel` (trigger `project_notes_no_edit`, migration 0012).
 */
export interface ProjectNoteRow {
  id: string;
  project_id: string;
  author_id: string | null;
  body: string;
  channel: NoteChannel;
  /** Instante da reunião (ISO) quando o canal é `reuniao`. */
  meeting_at: string | null;
  meeting_link: string;
  /** Resultado por destino; `{}` quando nada foi enviado. */
  delivery: Partial<Record<NoteTarget, NoteDeliveryOutcome>>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ---------------------------------------------------------------------------
// WhatsApp (Evolution) — atendimento
// ---------------------------------------------------------------------------

export interface WaInstanceRow {
  id: string;
  evolution_instance: string;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected';
  connected_number: string;
  last_state_at: string | null;
  created_at: string;
}

export interface WaConversationRow {
  id: string;
  instance_id: string;
  remote_jid: string;
  phone: string;
  push_name: string;
  is_group: boolean;
  project_id: string | null;
  /** O grupo eleito como "Comunicação Interna" (único no sistema). */
  is_internal: boolean;
  unread: number;
  last_message_at: string;
  last_message_preview: string;
  created_at: string;
}

export interface WaMessageRow {
  id: string;
  conversation_id: string;
  wa_message_id: string | null;
  direction: 'in' | 'out';
  author: 'contact' | 'agent';
  author_user_id: string | null;
  /** Quem falou dentro do grupo; vazio em conversa 1:1. */
  sender_name: string;
  body: string;
  media_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'other';
  note_id: string | null;
  sent_at: string;
  /** Preenchido quando o envio falhou — a bolha aparece marcada. */
  error: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  project_id: string | null;
  type: string;
  title: string;
  message: string;
  seen_at: string | null;
  read_at: string | null;
  created_at: string;
}

export type ProjectActivityAction =
  | 'projeto_criado'
  | 'projeto_editado'
  | 'responsavel_adicionado'
  | 'responsavel_removido'
  | 'status_alterado'
  | 'posicao_alterada'
  | 'observacao_adicionada'
  | 'observacao_editada'
  | 'projeto_finalizado'
  | 'projeto_reaberto'
  | 'projeto_arquivado';

export interface ProjectActivityRow {
  id: string;
  project_id: string;
  actor_id: string | null;
  action: ProjectActivityAction;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Clientes e custos (migration 0014)
// ---------------------------------------------------------------------------

export interface ClientRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/** Cliente + os agregados que a aba Leads mostra na linha (vêm do SQL). */
export interface ClientWithTotals extends ClientRow {
  project_count: number;
  total_value_cents: number;
  /** Soma das mensalidades ATIVAS dos projetos dele. */
  active_fee_cents: number;
  /** Quantos projetos têm mensalidade, e quantos estão ativos. */
  fee_count: number;
  active_fee_count: number;
  /** Menor dia de vencimento entre os projetos — `null` se nenhum tem. */
  due_day: number | null;
}

/** `unico` caiu uma vez; `mensal` repete todo mês enquanto `active`. */
export type CostKind = 'unico' | 'mensal';

export interface CostRow {
  id: string;
  /** `null` = custo da EMPRESA; preenchido = custo daquele projeto. */
  project_id: string | null;
  description: string;
  amount_cents: number;
  kind: CostKind;
  /** Único: quando caiu. Mensal: a partir de quando passou a valer. */
  incurred_on: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
