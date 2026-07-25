import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarCheck, LoaderCircle, Link2, QrCode, Unplug } from 'lucide-react';
import { useToast } from '../panel/ToastContext';
import * as service from './whatsappService';
import {
  fetchGoogleAuthUrl,
  fetchGoogleStatus,
  revokeGoogle,
  type GoogleStatus,
} from './meetingsService';

/**
 * Faixa de integrações do topo do Atendimento: número conectado, grupo de
 * Comunicação Interna e agenda do Google. Tudo aqui é ADMIN — a página inteira
 * já é.
 */
export function IntegrationBar({
  status,
  onChanged,
}: {
  status: service.WhatsappStatus;
  onChanged(): void;
}) {
  const { toast } = useToast();
  const [pairing, setPairing] = useState(false);
  const connected = status.instance?.status === 'connected';

  return (
    <div className="integrations">
      <WhatsappCard
        status={status}
        connected={connected}
        onPair={() => setPairing(true)}
        onChanged={onChanged}
      />
      <InternalGroupCard status={status} connected={connected} onChanged={onChanged} />
      <GoogleCard />

      {pairing && (
        <PairingModal
          onClose={() => {
            setPairing(false);
            onChanged();
          }}
          onConnected={() => {
            toast('success', 'WhatsApp conectado.');
            setPairing(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function WhatsappCard({
  status,
  connected,
  onPair,
  onChanged,
}: {
  status: service.WhatsappStatus;
  connected: boolean;
  onPair(): void;
  onChanged(): void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      await service.createInstance();
      onPair();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Falha ao criar a instância.');
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await service.disconnect();
      toast('success', 'Número desconectado.');
      onChanged();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Falha ao desconectar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="integrations__card">
      <header>
        <span className={`integrations__dot${connected ? ' is-on' : ''}`} aria-hidden="true" />
        <strong>WhatsApp</strong>
      </header>
      <p>
        {!status.configured
          ? 'Servidor sem EVOLUTION_URL/API_KEY.'
          : connected
            ? `Conectado · ${status.instance?.connected_number || 'número não informado'}`
            : 'Nenhum número conectado.'}
      </p>
      {status.configured && (
        <div className="integrations__actions">
          {connected ? (
            <button
              type="button"
              className="panel-btn panel-btn--ghost panel-btn--sm"
              disabled={busy}
              onClick={() => void stop()}
            >
              <Unplug size={14} aria-hidden="true" />
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              className="panel-btn panel-btn--sm"
              disabled={busy}
              onClick={() => void start()}
            >
              {busy ? (
                <LoaderCircle
                  size={14}
                  aria-hidden="true"
                  style={{ animation: 'panel-spin 900ms linear infinite' }}
                />
              ) : (
                <QrCode size={14} aria-hidden="true" />
              )}
              Conectar por QR Code
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Elege o grupo de Comunicação Interna. A lista vem da Evolution na hora — o
 * WhatsApp não avisa quando um grupo é criado, então buscar sob demanda é o
 * único jeito de a lista estar em dia.
 */
function InternalGroupCard({
  status,
  connected,
  onChanged,
}: {
  status: service.WhatsappStatus;
  connected: boolean;
  onChanged(): void;
}) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<service.GroupSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGroups = async () => {
    setLoading(true);
    try {
      setGroups(await service.fetchGroups());
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Falha ao listar os grupos.');
    } finally {
      setLoading(false);
    }
  };

  const choose = async (jid: string) => {
    const subject = groups?.find((g) => g.jid === jid)?.subject ?? '';
    try {
      await service.setInternalGroup(jid, subject);
      toast('success', `Comunicação Interna agora é "${subject}".`);
      onChanged();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Falha ao definir o grupo.');
    }
  };

  return (
    <article className="integrations__card">
      <header>
        <span
          className={`integrations__dot${status.internalGroup ? ' is-on' : ''}`}
          aria-hidden="true"
        />
        <strong>Comunicação Interna</strong>
      </header>
      <p>
        {status.internalGroup
          ? `Grupo: ${status.internalGroup.push_name || status.internalGroup.remote_jid}`
          : 'Nenhum grupo escolhido — o botão "Comunicação interna" fica indisponível.'}
      </p>
      {connected && (
        <div className="integrations__actions">
          {groups === null ? (
            <button
              type="button"
              className="panel-btn panel-btn--ghost panel-btn--sm"
              disabled={loading}
              onClick={() => void loadGroups()}
            >
              {loading ? (
                <LoaderCircle
                  size={14}
                  aria-hidden="true"
                  style={{ animation: 'panel-spin 900ms linear infinite' }}
                />
              ) : null}
              {status.internalGroup ? 'Trocar grupo' : 'Escolher grupo'}
            </button>
          ) : (
            <select
              className="panel-input"
              defaultValue={status.internalGroup?.remote_jid ?? ''}
              onChange={(event) => event.target.value && void choose(event.target.value)}
            >
              <option value="">Selecione um grupo…</option>
              {groups.map((group) => (
                <option key={group.jid} value={group.jid}>
                  {group.subject}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </article>
  );
}

/** Autorização da agenda que hospeda as reuniões do Meet. */
function GoogleCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<GoogleStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchGoogleStatus());
    } catch {
      setStatus({ configured: false, connected: false, email: '', authorizedAt: null });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // O backend devolve o navegador com ?google=ok|erro depois do consentimento.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('google');
    if (!result) return;
    if (result === 'ok') toast('success', 'Agenda do Google conectada.');
    else toast('error', params.get('detalhe') ?? 'Falha ao conectar o Google.');
    window.history.replaceState({}, '', window.location.pathname);
    void load();
  }, [load, toast]);

  const authorize = async () => {
    try {
      window.location.href = await fetchGoogleAuthUrl();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Falha ao iniciar a autorização.');
    }
  };

  const revoke = async () => {
    try {
      await revokeGoogle();
      toast('success', 'Autorização removida.');
      void load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Falha ao remover a autorização.');
    }
  };

  return (
    <article className="integrations__card">
      <header>
        <span
          className={`integrations__dot${status?.connected ? ' is-on' : ''}`}
          aria-hidden="true"
        />
        <strong>Google Meet</strong>
      </header>
      <p>
        {status === null
          ? 'Verificando…'
          : !status.configured
            ? 'Servidor sem GOOGLE_CLIENT_ID/SECRET.'
            : status.connected
              ? `Agenda de ${status.email || 'conta autorizada'}`
              : 'Agenda não conectada — o botão Reunião não consegue criar salas.'}
      </p>
      {status?.configured && (
        <div className="integrations__actions">
          {status.connected ? (
            <button
              type="button"
              className="panel-btn panel-btn--ghost panel-btn--sm"
              onClick={() => void revoke()}
            >
              <Unplug size={14} aria-hidden="true" />
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              className="panel-btn panel-btn--sm"
              onClick={() => void authorize()}
            >
              <CalendarCheck size={14} aria-hidden="true" />
              Conectar agenda
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Modal de pareamento. Refaz o QR a cada 20s (ele expira) e checa o estado da
 * conexão a cada 3s — o webhook `connection.update` também atualiza o banco,
 * mas o modal precisa saber na hora para fechar sozinho.
 */
function PairingModal({ onClose, onConnected }: { onClose(): void; onConnected(): void }) {
  const [pairing, setPairing] = useState<service.Pairing | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `onConnected` é uma arrow criada no render do pai: se entrasse nas deps do
  // efeito abaixo, os intervalos seriam recriados a cada render e o QR viraria
  // um loop de fetch. O ref mantém o callback atual sem virar dependência.
  const connectedRef = useRef(onConnected);
  connectedRef.current = onConnected;

  const refresh = useCallback(async () => {
    try {
      const result = await service.fetchQrCode();
      setError(null);
      setPairing(result);
      if (result.connected) connectedRef.current();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao obter o QR Code.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    // O QR expira; 20s é a janela que a Evolution aguenta sem recusar.
    const qrTimer = window.setInterval(() => void refresh(), 20_000);
    const stateTimer = window.setInterval(async () => {
      try {
        const { connected } = await service.fetchConnectionState();
        if (connected) connectedRef.current();
      } catch {
        /* estado desconhecido: o próximo ciclo tenta de novo */
      }
    }, 3000);
    return () => {
      window.clearInterval(qrTimer);
      window.clearInterval(stateTimer);
    };
  }, [refresh]);

  return (
    <div className="panel-overlay" role="dialog" aria-modal="true" aria-label="Conectar WhatsApp">
      <div className="panel-modal" style={{ maxWidth: 420, textAlign: 'center' }}>
        <h2 style={{ fontSize: 17, marginBottom: 6 }}>Conectar WhatsApp</h2>
        <p style={{ fontSize: 13, color: 'var(--panel-text-dim)', marginBottom: 16 }}>
          No celular: WhatsApp → Aparelhos conectados → Conectar aparelho.
        </p>

        {error ? (
          <>
            <p style={{ color: '#ff8a87', fontSize: 13, marginBottom: 12 }}>{error}</p>
            <button type="button" className="panel-btn panel-btn--sm" onClick={() => void refresh()}>
              Tentar de novo
            </button>
          </>
        ) : pairing?.qrBase64 ? (
          <img
            src={
              pairing.qrBase64.startsWith('data:')
                ? pairing.qrBase64
                : `data:image/png;base64,${pairing.qrBase64}`
            }
            alt="QR Code para conectar o WhatsApp"
            style={{ width: 260, height: 260, borderRadius: 10, background: '#fff' }}
          />
        ) : pairing?.pairingCode ? (
          <p style={{ fontFamily: 'var(--panel-mono)', fontSize: 22, letterSpacing: '0.2em' }}>
            {pairing.pairingCode}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--panel-text-faint)' }}>Gerando QR Code…</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18 }}>
          <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className="panel-btn panel-btn--ghost panel-btn--sm"
            onClick={() => void refresh()}
          >
            <Link2 size={14} aria-hidden="true" />
            Novo QR
          </button>
        </div>
      </div>
    </div>
  );
}
