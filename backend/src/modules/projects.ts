import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getPool, withActor } from '../db/pool';
import { staffOnly, adminOnly } from '../auth/middleware';
import { buildPatch } from './patch';
import { sendDbError } from './dbError';
import {
  CHANNEL_TARGETS,
  sendNote,
  type DeliveryReport,
  type ProjectForSend,
} from '../whatsapp/outbound';
import { contactStatusForProject } from '../whatsapp/repo';
import { hasAsaas } from '../env';
import { financeWorker } from '../finance/worker';
import { nextMonthlyDueDate } from '../finance/dueDate';
import { asaas, AsaasError } from '../finance/asaas';
import { blocksClientChange, clientChangeMessage } from '../finance/clientChange';
import { projectValueChangeError } from '../finance/projectValueChange';
import { queueProjectPaymentOperation, queueSubscriptionOperation } from '../finance/queue';

/** Janela da reserva da baixa manual — ver `RECEIPT_CLAIM_MS` em modules/finance. */
const RECEIPT_CLAIM_MS = 5 * 60_000;

/**
 * Observação = registro de mensagem. `channel` diz por onde ela saiu; `registro`
 * fica só no painel. Não existe rota de edição: o histórico é append-only e o
 * banco recusa UPDATE em `body`/`channel` (migration 0012).
 */
const noteSchema = z.object({
  body: z.string().trim().min(1),
  channel: z.enum(['registro', 'interna', 'aprovacao', 'reuniao']).default('registro'),
  /** Instante da reunião em ISO com fuso; só usado no canal `reuniao`. */
  meetingAt: z.string().datetime({ offset: true }).optional(),
  meetingLink: z.string().trim().max(500).optional(),
});

const PROJECT_PATCH_COLS = [
  'name',
  'description',
  'value_cents',
  'client_name',
  'client_phone',
  'client_email',
  'company',
  'due_date',
  'color_key',
  'client_id',
] as const;

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  valueCents: z.number().int().nonnegative(),
  monthlyFeeCents: z.number().int().nonnegative().default(0),
  subscriptionActive: z.boolean().default(false),
  clientName: z.string().default(''),
  clientPhone: z.string().default(''),
  clientEmail: z.string().default(''),
  clientCpfCnpj: z.string().trim().max(20).optional(),
  company: z.enum(['tenka', 'pjcodeworks']).default('tenka'),
  clientId: z.string().uuid().nullable().default(null),
  dueDay: z.number().int().min(1).max(31).nullable().default(null),
  dueDate: z.string(),
  colorKey: z.string(),
  assigneeIds: z.array(z.string().uuid()).default([]),
}).refine((value) => value.monthlyFeeCents === 0 || value.dueDay !== null, {
  message: 'due-day-required-for-subscription',
}).refine((value) => !value.subscriptionActive || value.monthlyFeeCents > 0, {
  message: 'monthly-fee-required-for-activation',
});

const moveSchema = z.object({
  status: z.enum(['inicio', 'em_andamento', 'finalizado']),
  index: z.number().int().nonnegative(),
});

const competenceSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const externalPaymentSchema = z.object({
  competence: competenceSchema,
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const projectLifecycleSchema = z.object({
  subscriptionAction: z.enum(['keep', 'pause', 'cancel']).optional(),
});

function isAdmin(req: FastifyRequest): boolean {
  return req.profile?.role === 'admin';
}

/** Garante que o usuário enxerga o projeto (admin ou atribuído). */
async function canAccess(userId: string, admin: boolean, projectId: string): Promise<boolean> {
  if (admin) return true;
  const { rows } = await getPool().query(
    'select 1 from public.project_assignees where project_id = $1 and user_id = $2',
    [projectId, userId],
  );
  return rows.length > 0;
}

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // ---- Board: projetos visíveis + responsáveis, montados -------------------
  app.get('/projects/board', staffOnly, async (req, reply) => {
    const userId = req.userId!;
    const admin = isAdmin(req);
    const pool = getPool();
    const [projectsRes, assigneesRes] = await Promise.all([
      pool.query(
        `select p.* from public.projects p
          where p.archived_at is null
            and ($2 or exists (select 1 from public.project_assignees a
                                where a.project_id = p.id and a.user_id = $1))
          order by p.status, p.position`,
        [userId, admin],
      ),
      pool.query(
        `select pa.* from public.project_assignees pa
          where $2 or pa.user_id = $1
             or exists (select 1 from public.project_assignees a2
                         where a2.project_id = pa.project_id and a2.user_id = $1)`,
        [userId, admin],
      ),
    ]);

    const byProject = new Map<string, unknown[]>();
    for (const row of assigneesRes.rows as Array<{ project_id: string }>) {
      const list = byProject.get(row.project_id) ?? [];
      list.push(row);
      byProject.set(row.project_id, list);
    }
    const projects = (projectsRes.rows as Array<{ id: string }>).map((p) => ({
      ...p,
      assignees: byProject.get(p.id) ?? [],
    }));
    return reply.send({ projects });
  });

  // ---- Cobranças mensais ---------------------------------------------------
  // O Asaas é a fonte de verdade: a listagem expõe o estado e os links que
  // chegaram pelo webhook, sem criar uma segunda baixa financeira na Tenka.
  app.get('/subscription-payments', staffOnly, async (req, reply) => {
    const parsed = competenceSchema.safeParse(
      (req.query as { competence?: string }).competence,
    );
    if (!parsed.success) return reply.code(400).send({ error: 'competencia-invalida' });

    const { rows } = await getPool().query<{ project_id: string; status: string }>(
      `select sp.*
         from public.subscription_payments sp
         join public.projects p on p.id = sp.project_id
        where sp.competence = ($1 || '-01')::date
          and p.archived_at is null
          and ($3 or exists (select 1 from public.project_assignees a
                              where a.project_id = p.id and a.user_id = $2))`,
      [parsed.data, req.userId, isAdmin(req)],
    );
    return reply.send({
      payments: rows,
      // Mantido durante a transição para clientes antigos, mas é somente leitura.
      paidProjectIds: rows
        .filter((row) => ['confirmed', 'received', 'legacy_paid'].includes(row.status))
        .map((row) => row.project_id),
    });
  });

  // Compatibilidade segura: clientes antigos não podem mais criar nem apagar
  // baixas locais. Uma mensalidade integrada só muda após o webhook do Asaas.
  app.put(
    '/projects/:id/subscription-payment',
    adminOnly,
    async (_req, reply) => reply.code(409).send({
      error: 'pagamento-mensal-deve-ser-registrado-no-asaas',
    }),
  );

  app.post(
    '/projects/:id/subscription-payment/receive-in-cash',
    adminOnly,
    async (req, reply) => {
      if (!hasAsaas) return reply.code(503).send({ error: 'asaas-nao-configurado' });
      const { id } = req.params as { id: string };
      const parsed = externalPaymentSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });

      // A linha é reservada antes da chamada: dois cliques simultâneos viravam
      // duas baixas no Asaas, e a segunda voltava como erro do provedor.
      const claim = await withActor(req.userId!, async (client) => {
        const { rows } = await client.query<{
          id: string;
          asaas_payment_id: string | null;
          amount_cents: number;
          status: string;
          source: string;
          external_receipt_pending_at: string | null;
        }>(
          `select id, asaas_payment_id, amount_cents, status, source,
                  external_receipt_pending_at
             from public.subscription_payments
            where project_id = $1 and competence = ($2 || '-01')::date
            for update`,
          [id, parsed.data.competence],
        );
        const payment = rows[0];
        if (!payment) return 'missing' as const;
        if (payment.source !== 'asaas' || !payment.asaas_payment_id) return 'not-linked' as const;
        if (!['pending', 'overdue', 'failed'].includes(payment.status)) return 'not-open' as const;
        if (payment.external_receipt_pending_at
          && Date.now() - Date.parse(payment.external_receipt_pending_at) < RECEIPT_CLAIM_MS) {
          return 'in-progress' as const;
        }
        await client.query(
          `update public.subscription_payments
              set external_receipt_pending_at = now() where id = $1`,
          [payment.id],
        );
        return payment;
      });
      if (claim === 'missing') return reply.code(404).send({ error: 'cobranca-mensal-nao-encontrada' });
      if (claim === 'not-linked') {
        return reply.code(409).send({ error: 'cobranca-mensal-nao-vinculada-ao-asaas' });
      }
      if (claim === 'not-open') {
        return reply.code(409).send({ error: 'cobranca-mensal-nao-esta-em-aberto' });
      }
      if (claim === 'in-progress') return reply.code(409).send({ error: 'baixa-manual-em-andamento' });

      try {
        await asaas.receivePaymentInCash(claim.asaas_payment_id!, {
          paymentDate: parsed.data.paymentDate,
          value: Number(claim.amount_cents) / 100,
          notifyCustomer: true,
        });
        // Não atualiza subscription_payments aqui. PAYMENT_RECEIVED precisa
        // chegar pelo webhook para a Tenka refletir o pagamento. O que fica
        // registrado agora é só a intenção — e quem a teve.
        await withActor(req.userId!, (client) => client.query(
          `insert into public.project_activity (project_id, actor_id, action, metadata)
           values ($1,$2,'pagamento_baixa_manual',$3::jsonb)`,
          [id, req.userId, JSON.stringify({
            scope: 'mensalidade', competence: parsed.data.competence,
            amountCents: Number(claim.amount_cents),
            paymentDate: parsed.data.paymentDate,
            asaasPaymentId: claim.asaas_payment_id,
          })],
        ));
        return reply.code(202).send({ submitted: true, awaitingWebhook: true });
      } catch (error) {
        await getPool().query(
          `update public.subscription_payments
              set external_receipt_pending_at = null where id = $1`, [claim.id],
        ).catch(() => {});
        if (error instanceof AsaasError) {
          req.log.error({ err: error, projectId: id }, 'asaas receive in cash error');
          // Não propaga 401/403 do provedor como se a sessão da Tenka tivesse
          // expirado; para o painel isto é uma falha da integração externa.
          return reply.code(502).send({ error: error.message });
        }
        return sendDbError(error, reply);
      }
    },
  );

  // ---- Criação (admin) via RPC + update dos campos extras ------------------
  app.post('/projects', adminOnly, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const i = parsed.data;
    let clientCpfCnpj = i.clientCpfCnpj;
    if (i.clientId && clientCpfCnpj === undefined) {
      const existingClient = await getPool().query<{ cpf_cnpj: string }>(
        'select cpf_cnpj from public.clients where id = $1 and archived_at is null',
        [i.clientId],
      );
      clientCpfCnpj = existingClient.rows[0]?.cpf_cnpj ?? '';
    }
    if (i.subscriptionActive && !hasAsaas) {
      return reply.code(503).send({ error: 'asaas-nao-configurado' });
    }
    if (i.subscriptionActive) {
      if (!i.clientId) return reply.code(409).send({ error: 'cliente-obrigatorio-para-ativacao' });
      if (!clientCpfCnpj?.trim()) {
        return reply.code(409).send({ error: 'cpf-cnpj-obrigatorio-para-ativacao' });
      }
    }
    try {
      const id = await withActor(req.userId!, async (client) => {
        // Se um cliente existente foi selecionado, telefone/e-mail editados no
        // formulário são atualizados na mesma transação da criação. Assim o
        // projeto não nasce com um contato diferente do cadastro central.
        if (i.clientId) {
          const updated = await client.query(
            `update public.clients
                set name = $2, phone = $3, email = $4, cpf_cnpj = $5
              where id = $1 and archived_at is null`,
            [i.clientId, i.clientName.trim(), i.clientPhone.trim(), i.clientEmail.trim(), clientCpfCnpj ?? ''],
          );
          if (updated.rowCount === 0) throw new Error('Cliente inexistente ou arquivado.');
        }
        const { rows } = await client.query(
          'select public.create_project($1,$2,$3,$4,$5,$6::uuid[]) as id',
          [i.name, i.description, i.valueCents, i.dueDate, i.colorKey, i.assigneeIds],
        );
        const newId = (rows[0] as { id: string }).id;
        await client.query(
          `update public.projects
              set monthly_fee_cents = $2, subscription_active = $3,
                  client_name = $4, client_phone = $5, client_email = $6, company = $7,
                  client_id = $8, due_day = $9
            where id = $1`,
          [
            newId,
            i.monthlyFeeCents,
            false,
            i.clientName,
            i.clientPhone,
            i.clientEmail,
            i.company,
            i.clientId,
            i.dueDay,
          ],
        );
        if (i.monthlyFeeCents > 0) {
          const nextDueDate = nextMonthlyDueDate(i.dueDay ?? 10);
          // A referência é enviada como parâmetro próprio: reutilizar o UUID
          // como texto na mesma query faz o Postgres inferir dois tipos para $1.
          const subscriptionResult = await client.query<{ id: string }>(
            `insert into public.project_subscriptions
               (project_id, amount_cents, billing_type, due_day, next_due_date, status,
                external_reference, created_by)
             values ($1::uuid,$2,'UNDEFINED',$3,$4,$5,$6,$7)
             returning id`,
            [newId, i.monthlyFeeCents, i.dueDay ?? 10, nextDueDate,
              i.subscriptionActive ? 'pending_activation' : 'draft',
              `project-subscription:${newId}`, req.userId],
          );
          const subscription = subscriptionResult.rows[0];
          if (!subscription) throw new Error('Falha ao criar a assinatura do projeto.');
          if (i.subscriptionActive) {
            await client.query(
              `insert into public.asaas_operations
                 (operation_key, project_id, subscription_id, kind)
               select 'activate_subscription:' || gen_random_uuid()::text,$1,$2,'activate_subscription'
                where not exists (
                  select 1
                    from public.asaas_operations
                   where subscription_id = $2
                     and kind = 'activate_subscription'
                     and (status in ('pending', 'processing', 'uncertain')
                       or (status = 'failed' and attempts < 5))
                )`,
              [newId, subscription.id],
            );
          }
          await client.query(
            `insert into public.project_activity (project_id, actor_id, action, metadata)
             values ($1,$2,'assinatura_configurada',$3::jsonb)`,
            [newId, req.userId, JSON.stringify({
              initial: true,
              amountCents: i.monthlyFeeCents,
              dueDay: i.dueDay,
              nextDueDate,
              activate: i.subscriptionActive,
            })],
          );
        }
        return newId;
      });
      if (i.subscriptionActive) financeWorker.kick();
      return reply.code(201).send({ id });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  // ---- Movimentação (admin ou atribuído) via RPC --------------------------
  app.post('/projects/:id/move', staffOnly, async (req, reply) => {
    const parsed = moveSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const { id } = req.params as { id: string };
    try {
      await withActor(req.userId!, async (client) => {
        await client.query('select public.move_project($1,$2,$3)', [
          id,
          parsed.data.status,
          parsed.data.index,
        ]);
      });
      return reply.send({ ok: true });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  // ---- Edição de campos (admin) -------------------------------------------
  app.patch('/projects/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch = buildPatch(PROJECT_PATCH_COLS, body);
    if (!patch) return reply.code(400).send({ error: 'nada-a-atualizar' });
    try {
      const blocked = await withActor(req.userId!, async (client) => {
        if (body.value_cents !== undefined) {
          const nextTotal = Number(body.value_cents);
          if (!Number.isInteger(nextTotal) || nextTotal < 0) return 'invalid-value' as const;
          const totals = await client.query<{
            distributed_cents: string; paid_cents: string; current_value_cents: number;
          }>(
            `select p.value_cents as current_value_cents,
                    (select coalesce(sum(pp.amount_cents), 0)::text
                       from public.project_payments pp
                      where pp.project_id = p.id and pp.status <> 'cancelled') as distributed_cents,
                    (select coalesce(sum(pp.amount_cents), 0)::text
                       from public.project_payments pp
                      where pp.project_id = p.id and pp.status = 'paid') as paid_cents
               from public.projects p
              where p.id = $1
              for update of p`,
            [id],
          );
          const financial = totals.rows[0];
          if (!financial) return 'missing' as const;
          const distributed = Number(financial.distributed_cents);
          const paid = Number(financial.paid_cents);
          const valueError = projectValueChangeError(nextTotal, distributed, paid);
          if (valueError) return valueError;

          // Se o contrato passa a ter saldo livre, abre uma versao editavel do
          // plano sem tocar na versao ativa nem nas cobrancas existentes.
          if (nextTotal !== financial.current_value_cents && distributed > 0 && nextTotal !== distributed) {
            await client.query(
              `insert into public.project_payment_plan_drafts (project_id, payments, updated_by)
               select $1,
                      coalesce(jsonb_agg(jsonb_build_object(
                        'id', pp.id, 'name', pp.name, 'description', pp.description,
                        'amountCents', pp.amount_cents, 'dueDate', pp.due_date,
                        'kind', pp.kind, 'installmentGroupId', pp.installment_group_id,
                        'installmentNumber', pp.installment_number,
                        'installmentCount', pp.installment_count, 'groupLabel', pp.group_label
                      ) order by pp.position) filter (where pp.id is not null), '[]'::jsonb),
                      $2
                 from public.project_payments pp
                where pp.project_id = $1
               on conflict (project_id) do nothing`,
              [id, req.userId],
            );
          }
        }
        // Trocar o cliente de um projeto que já cobra pelo Asaas quebraria o
        // vínculo: lá a cobrança continua no cliente antigo e não há como
        // migrá-la. A edição inteira é recusada para o painel não gravar
        // metade da mudança.
        if (body.client_id !== undefined) {
          const current = await client.query<{ client_id: string | null }>(
            'select client_id from public.projects where id = $1 for update', [id]);
          const before = current.rows[0]?.client_id ?? null;
          const after = (body.client_id as string | null) ?? null;
          if (current.rows[0] && before !== after) {
            const [subscription, charges] = await Promise.all([
              client.query<{ status: string; asaas_subscription_id: string | null }>(
                `select status, asaas_subscription_id
                   from public.project_subscriptions where project_id = $1`, [id]),
              client.query<{ open: string }>(
                `select count(*)::text as open from public.project_payments
                  where project_id = $1 and asaas_payment_id is not null and status = 'pending'`,
                [id]),
            ]);
            const block = blocksClientChange({
              subscriptionStatus: subscription.rows[0]?.status ?? null,
              asaasSubscriptionId: subscription.rows[0]?.asaas_subscription_id ?? null,
              openSyncedCharges: Number(charges.rows[0]?.open ?? 0),
            });
            if (block) return block;
          }
        }
        await client.query(
          `update public.projects set ${patch.set} where id = $1`, [id, ...patch.values]);
        return null;
      });
      if (blocked) {
        if (blocked === 'invalid-value') {
          return reply.code(400).send({ error: 'valor-total-invalido' });
        }
        if (blocked === 'missing') {
          return reply.code(404).send({ error: 'projeto-inexistente' });
        }
        if (blocked === 'abaixo-do-pago') {
          return reply.code(409).send({
            error: 'valor-total-abaixo-do-pago',
            message: 'O valor total não pode ficar abaixo do que já foi pago.',
          });
        }
        if (blocked === 'abaixo-do-distribuido') {
          return reply.code(409).send({
            error: 'valor-total-abaixo-do-distribuido',
            message: 'Ajuste primeiro as etapas ou parcelas: o novo total é menor que o valor distribuído.',
          });
        }
        return reply.code(409).send({
          error: 'cliente-vinculado-a-cobrancas',
          message: clientChangeMessage(blocked),
        });
      }
      return reply.send({ ok: true });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  // ---- Arquivar / finalizar / reabrir (admin) -----------------------------
  const stamp = (col: 'archived_at' | 'finalized_at', value: 'now' | null) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const parsed = projectLifecycleSchema.safeParse(req.body ?? {});
      if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
      const result = await withActor(req.userId!, async (client) => {
        const project = await client.query<{
          name: string; subscription_id: string | null; subscription_status: string | null;
          asaas_subscription_id: string | null;
        }>(
          `select p.name, ps.id as subscription_id, ps.status as subscription_status,
                  ps.asaas_subscription_id
             from public.projects p
             left join public.project_subscriptions ps on ps.project_id = p.id
            where p.id = $1 for update of p`,
          [id],
        );
        const row = project.rows[0];
        if (!row) return 'missing' as const;
        const hasLiveSubscription = Boolean(
          row.subscription_id && row.asaas_subscription_id
          && !['inactive', 'cancelled'].includes(row.subscription_status ?? ''),
        );
        const action = parsed.data.subscriptionAction;
        if (value === 'now' && hasLiveSubscription && !action) return 'action-required' as const;
        if (value === 'now' && hasLiveSubscription && action !== 'keep') {
          if (!hasAsaas) return 'asaas' as const;
          await queueSubscriptionOperation(
            client,
            id,
            row.subscription_id!,
            action === 'pause' ? 'pause_subscription' : 'cancel_subscription',
          );
        }
        // Arquivar tira o projeto da visão financeira. Uma cobrança de etapa
        // deixada em aberto continuaria chegando ao cliente sem aparecer em
        // lugar nenhum do painel, então o arquivamento a encerra junto.
        // Finalizar não faz isso: um projeto entregue ainda tem o que receber.
        let cancelledCharges = 0;
        let cancelledLocally = 0;
        if (col === 'archived_at' && value === 'now') {
          const openCharges = await client.query<{ id: string }>(
            `select id from public.project_payments
              where project_id = $1 and status = 'pending'
                and asaas_payment_id is not null and sync_status <> 'local'
              order by position
              for update`,
            [id],
          );
          if (openCharges.rows.length > 0 && !hasAsaas) return 'asaas' as const;
          for (const charge of openCharges.rows) {
            const queued = await queueProjectPaymentOperation(
              client, id, charge.id, 'cancel_project_charge');
            if (!queued) continue;
            cancelledCharges += 1;
            await client.query(
              `update public.project_payments
                  set sync_status = 'queued', sync_error = null where id = $1`,
              [charge.id],
            );
          }
          // As que nunca saíram daqui não têm o que cancelar no provedor.
          const localOpen = await client.query(
            `update public.project_payments
                set status = 'cancelled'
              where project_id = $1 and status = 'pending' and asaas_payment_id is null`,
            [id],
          );
          cancelledLocally = localOpen.rowCount ?? 0;
          if (cancelledCharges > 0 || cancelledLocally > 0) {
            await client.query(
              `insert into public.project_activity (project_id, actor_id, action, metadata)
               values ($1,$2,'cobrancas_encerradas_por_arquivamento',$3::jsonb)`,
              [id, req.userId, JSON.stringify({
                cancelledAtProvider: cancelledCharges, cancelledLocally,
              })],
            );
          }
        }
        await client.query(
          `update public.projects set ${col} = ${value === 'now' ? 'now()' : 'null'} where id = $1`,
          [id],
        );
        return {
          queued: (value === 'now' && hasLiveSubscription && action !== 'keep') || cancelledCharges > 0,
          cancelledCharges,
          cancelledLocally,
        };
      });
      if (result === 'missing') return reply.code(404).send({ error: 'projeto-inexistente' });
      if (result === 'action-required') {
        return reply.code(409).send({
          error: 'acao-da-assinatura-obrigatoria',
          message: 'Escolha se a assinatura deve continuar, ser pausada ou ser cancelada.',
        });
      }
      if (result === 'asaas') return reply.code(503).send({ error: 'asaas-nao-configurado' });
      if (result.queued) financeWorker.kick();
      return reply.send({
        ok: true, queued: result.queued,
        cancelledCharges: result.cancelledCharges,
        cancelledLocally: result.cancelledLocally,
      });
    };
  app.post('/projects/:id/archive', adminOnly, stamp('archived_at', 'now'));
  app.post('/projects/:id/finalize', adminOnly, stamp('finalized_at', 'now'));
  app.post('/projects/:id/reopen', adminOnly, stamp('finalized_at', null));

  // ---- Responsáveis (admin) -----------------------------------------------
  app.post('/projects/:id/assignees', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ userId: z.string().uuid() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid-body' });
    try {
      await withActor(req.userId!, (client) =>
        client.query(
          `insert into public.project_assignees (project_id, user_id, assigned_by)
           values ($1, $2, $3) on conflict do nothing`,
          [id, body.data.userId, req.userId],
        ),
      );
      return reply.code(201).send({ ok: true });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  app.delete(
    '/projects/:id/assignees/:userId',
    adminOnly,
    async (req, reply) => {
      const { id, userId } = req.params as { id: string; userId: string };
      await withActor(req.userId!, (client) =>
        client.query('delete from public.project_assignees where project_id = $1 and user_id = $2', [
          id,
          userId,
        ]),
      );
      return reply.send({ ok: true });
    },
  );

  // ---- Observações ---------------------------------------------------------
  app.get('/projects/:id/notes', staffOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await canAccess(req.userId!, isAdmin(req), id)))
      return reply.code(403).send({ error: 'sem-acesso' });
    const { rows } = await getPool().query(
      `select * from public.project_notes
        where project_id = $1 and deleted_at is null order by created_at desc`,
      [id],
    );
    return reply.send({ notes: rows });
  });

  /**
   * Cria a observação e, conforme o canal, despacha no WhatsApp.
   *
   * Duas transações de propósito: a observação é gravada e COMMITADA antes de
   * qualquer chamada de rede. Se a Evolution cair (ou o processo morrer) no meio
   * do envio, o texto que a pessoa escreveu não se perde — ela volta e vê a
   * observação registrada com a entrega marcada como falha.
   */
  app.post('/projects/:id/notes', staffOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    if (!(await canAccess(req.userId!, isAdmin(req), id)))
      return reply.code(403).send({ error: 'sem-acesso' });

    const { body, channel, meetingAt, meetingLink } = parsed.data;
    if (channel === 'reuniao' && !meetingAt) {
      return reply.code(400).send({ error: 'reuniao-sem-horario' });
    }

    const note = await withActor(req.userId!, async (client) => {
      const { rows } = await client.query(
        `insert into public.project_notes
           (project_id, author_id, body, channel, meeting_at, meeting_link)
         values ($1, $2, $3, $4, $5, $6) returning *`,
        [id, req.userId, body, channel, meetingAt ?? null, meetingLink ?? ''],
      );
      return rows[0] as { id: string; delivery: Record<string, unknown> };
    });

    if (CHANNEL_TARGETS[channel].length === 0) return reply.code(201).send({ note });

    const { rows: projectRows } = await getPool().query<ProjectForSend>(
      'select id, name, client_name, client_phone from public.projects where id = $1',
      [id],
    );
    const project = projectRows[0];
    if (!project) return reply.code(404).send({ error: 'projeto-inexistente' });

    let delivery: DeliveryReport;
    try {
      delivery = await withActor(req.userId!, (client) =>
        sendNote(client, {
          project,
          channel,
          body,
          userId: req.userId!,
          noteId: note.id,
          authorName: req.profile?.name ?? 'TENKA',
          meeting: meetingAt ? { startsAt: new Date(meetingAt), link: meetingLink ?? '' } : null,
        }),
      );
    } catch (e) {
      // WhatsApp indisponível/desconfigurado: a observação já está salva; marca
      // TODOS os destinos do canal como não entregues.
      const error = e instanceof Error ? e.message : 'Falha ao enviar.';
      delivery = Object.fromEntries(
        CHANNEL_TARGETS[channel].map((target) => [target, { ok: false, error }]),
      );
    }

    // `delivery` é a única coluna mutável da observação — ver o trigger
    // `project_notes_no_edit` na migration 0012.
    const { rows } = await getPool().query(
      'update public.project_notes set delivery = $2::jsonb where id = $1 returning *',
      [note.id, JSON.stringify(delivery)],
    );
    return reply.code(201).send({ note: rows[0] });
  });

  /**
   * O cliente deste projeto já nos escreveu no WhatsApp?
   *
   * Serve ao aviso de contato frio nos botões de envio da observação. Devolve
   * `hasInbound:false` também quando o WhatsApp está desligado ou o projeto não
   * tem telefone — o aviso some sozinho porque, nesses casos, os botões que ele
   * qualifica já estão indisponíveis.
   */
  app.get('/projects/:id/contact-status', staffOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await canAccess(req.userId!, isAdmin(req), id)))
      return reply.code(403).send({ error: 'sem-acesso' });

    const { rows } = await getPool().query<{ client_phone: string }>(
      'select client_phone from public.projects where id = $1',
      [id],
    );
    const phone = rows[0]?.client_phone ?? '';
    if (!phone.trim()) {
      return reply.send({ hasConversation: false, hasInbound: false, conversationId: null });
    }
    return reply.send(await contactStatusForProject(id, phone));
  });

  // ---- Trilha de atividade -------------------------------------------------
  app.get('/projects/:id/activity', staffOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await canAccess(req.userId!, isAdmin(req), id)))
      return reply.code(403).send({ error: 'sem-acesso' });
    const limit = Math.min(Number((req.query as { limit?: string }).limit ?? 40) || 40, 200);
    const { rows } = await getPool().query(
      `select * from public.project_activity
        where project_id = $1 order by created_at desc limit $2`,
      [id, limit],
    );
    return reply.send({ activity: rows });
  });
}
