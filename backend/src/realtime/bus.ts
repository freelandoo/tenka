import { Client } from 'pg';
import { env } from '../env';

/**
 * Barramento de realtime: uma única conexão dedicada em `LISTEN tenka_events`
 * recebe os NOTIFY das mutações (ver migration 0011) e faz fan-out para os
 * clientes SSE conectados. Fica fora do pool porque uma conexão em LISTEN é
 * longa-vida e não pode ser reciclada entre requests.
 *
 * Se a conexão cair (deploy do Postgres, rede), reconecta sozinha em segundo
 * plano — os clientes SSE seguem abertos e voltam a receber quando o LISTEN
 * reergue.
 */

export interface ChangeEvent {
  /** Tabela/assunto que mudou. */
  t:
    | 'projects'
    | 'project_assignees'
    | 'daily_tasks'
    | 'notifications'
    | 'project_notes'
    | 'wa_conversations'
    | 'wa_messages'
    | 'clients'
    | 'costs'
    | 'project_subscriptions'
    | 'project_payments'
    | 'subscription_payments';
  /** Dono da notificação (só em eventos de `notifications`). */
  u?: string;
  /** Conversa afetada (só em eventos de `wa_messages`) — a thread aberta filtra por ela. */
  c?: string;
}

export interface Subscriber {
  userId: string;
  /** Conta da TENKA. Cliente conectado só recebe as próprias notificações. */
  staff: boolean;
  send: (event: ChangeEvent) => void;
}

const subscribers = new Set<Subscriber>();
let client: Client | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let stopped = false;

function broadcast(event: ChangeEvent): void {
  for (const sub of subscribers) {
    // Eventos de notificação vão só para o dono; o resto é board-wide — e
    // board é operação: uma conta de cliente não é avisada de mudanças no
    // Kanban, na carteira ou no atendimento da agência.
    if (event.t === 'notifications') {
      if (event.u && sub.userId !== event.u) continue;
    } else if (!sub.staff) {
      continue;
    }
    try {
      sub.send(event);
    } catch {
      /* conexão do cliente morta — o handler de close do SSE já a remove */
    }
  }
}

function scheduleReconnect(): void {
  if (stopped || reconnectTimer) return;
  if (client) {
    client.removeAllListeners();
    client.end().catch(() => {});
    client = null;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect().catch(() => scheduleReconnect());
  }, 2000);
}

async function connect(): Promise<void> {
  if (stopped) return;
  const c = new Client({
    connectionString: env.databaseUrl,
    ssl:
      env.nodeEnv === 'production' && !env.databaseUrl.includes('localhost')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  c.on('notification', (msg) => {
    if (!msg.payload) return;
    try {
      broadcast(JSON.parse(msg.payload) as ChangeEvent);
    } catch {
      /* payload malformado — ignora */
    }
  });
  c.on('error', () => scheduleReconnect());
  await c.connect();
  await c.query('listen tenka_events');
  client = c;
}

export const realtimeBus = {
  /** Inicia o LISTEN (chamado no boot, depois de haver banco). */
  async start(): Promise<void> {
    stopped = false;
    await connect().catch(() => scheduleReconnect());
  },
  /** Encerra tudo no shutdown gracioso. */
  async stop(): Promise<void> {
    stopped = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (client) {
      await client.end().catch(() => {});
      client = null;
    }
    subscribers.clear();
  },
  subscribe(sub: Subscriber): void {
    subscribers.add(sub);
  },
  unsubscribe(sub: Subscriber): void {
    subscribers.delete(sub);
  },
};
