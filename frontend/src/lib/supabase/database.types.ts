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
  /** Dados do lead/cliente (a aba Leads é uma visão sobre estes campos). */
  client_name: string;
  client_phone: string;
  client_email: string;
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

export interface ProjectNoteRow {
  id: string;
  project_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
