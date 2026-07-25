import { useCallback, useEffect, useState } from 'react';
import { AtendimentoInbox } from '../../features/whatsapp/AtendimentoInbox';
import { IntegrationBar } from '../../features/whatsapp/IntegrationBar';
import { fetchStatus, type WhatsappStatus } from '../../features/whatsapp/whatsappService';
import { subscribeRealtime } from '../../lib/api/events';

/**
 * Atendimento — a inbox do WhatsApp da TENKA.
 *
 * Página de administrador: concentra as conversas de todos os clientes num só
 * lugar, o que furaria o recorte por atribuição do Kanban se ficasse aberta a
 * colaborador. O colaborador atribuído continua conversando pelo seu projeto,
 * nos botões da observação do post-it.
 */
export default function AtendimentoPage() {
  const [status, setStatus] = useState<WhatsappStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchStatus());
    } catch {
      setStatus({ configured: false, instance: null, internalGroup: null });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // O status da instância muda por webhook (connection.update) — o mesmo SSE
  // que move a lista de conversas avisa que vale reler o cabeçalho.
  useEffect(() => subscribeRealtime(['wa_conversations'], () => void load()), [load]);

  return (
    <div style={{ maxWidth: 1180, width: '100%', margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
          Atendimento
        </p>
        <h1 style={{ fontSize: 23, fontWeight: 700 }}>WhatsApp</h1>
        <p style={{ fontSize: 13.5, color: 'var(--panel-text-dim)', marginTop: 6 }}>
          Conversas dos clientes e grupos da agência. Nada é respondido automaticamente: toda
          mensagem que sai daqui é um clique seu.
        </p>
      </header>

      {status && <IntegrationBar status={status} onChanged={load} />}

      <AtendimentoInbox configured={status?.configured ?? false} />
    </div>
  );
}
