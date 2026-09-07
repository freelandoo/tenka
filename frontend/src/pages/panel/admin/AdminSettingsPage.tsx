import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, MessageSquare } from 'lucide-react';
import { fetchStatus, type WhatsappStatus } from '../../../features/whatsapp/whatsappService';
import {
  fetchGoogleStatus,
  type GoogleStatus,
} from '../../../features/whatsapp/meetingsService';

type Estado = 'ok' | 'pendente' | 'off';

const ESTADO_LABEL: Record<Estado, string> = {
  ok: 'Conectado',
  pendente: 'Configurado, sem conexão',
  off: 'Não configurado',
};

function StatusPill({ estado }: { estado: Estado }) {
  return <span className={`panel-pill panel-pill--${estado}`}>{ESTADO_LABEL[estado]}</span>;
}

/**
 * Configurações globais da plataforma.
 *
 * Aqui ficam os ajustes que valem para a TENKA inteira — hoje, o estado das
 * integrações e a referência dos papéis. Preferências da própria conta (nome,
 * senha) continuam em /painel/configuracoes: são coisas diferentes, e misturar
 * as duas foi o que fez a antiga área "Admin" virar um cesto de tudo.
 */
export default function AdminSettingsPage() {
  const [whatsapp, setWhatsapp] = useState<WhatsappStatus | null>(null);
  const [google, setGoogle] = useState<GoogleStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStatus()
      .then((status) => {
        if (!cancelled) setWhatsapp(status);
      })
      .catch(() => {
        if (!cancelled) setWhatsapp({ configured: false, instance: null, internalGroup: null });
      });
    fetchGoogleStatus()
      .then((status) => {
        if (!cancelled) setGoogle(status);
      })
      .catch(() => {
        if (!cancelled) {
          setGoogle({ configured: false, connected: false, email: '', authorizedAt: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const estadoWhatsapp: Estado = !whatsapp?.configured
    ? 'off'
    : whatsapp.instance
      ? 'ok'
      : 'pendente';
  const estadoGoogle: Estado = !google?.configured ? 'off' : google.connected ? 'ok' : 'pendente';

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
          Administração
        </p>
        <h1 style={{ fontSize: 23, fontWeight: 700 }}>Configurações</h1>
        <p
          style={{
            fontSize: 13.5,
            color: 'var(--panel-text-dim)',
            marginTop: 6,
            maxWidth: 640,
            lineHeight: 1.55,
          }}
        >
          Ajustes que valem para a plataforma inteira. Sua conta (nome e senha) fica em{' '}
          <Link to="/painel/configuracoes" className="panel-link">
            Configurações da conta
          </Link>
          .
        </p>
      </header>

      <section>
        <div className="panel-section__head">
          <h2 className="panel-section__title">Integrações</h2>
        </div>
        <div className="panel-cards">
          <article className="panel-card">
            <div className="panel-card__head">
              <h3 className="panel-card__title">
                <MessageSquare size={16} aria-hidden="true" />
                WhatsApp
              </h3>
              <StatusPill estado={estadoWhatsapp} />
            </div>
            <p className="panel-card__text">
              Inbox de atendimento da agência. A conexão da instância e o grupo interno são
              gerenciados na própria tela de Atendimento.
            </p>
            <Link to="/painel/atendimento" className="panel-btn">
              Abrir Atendimento
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </article>

          <article className="panel-card">
            <div className="panel-card__head">
              <h3 className="panel-card__title">
                <CalendarCheck size={16} aria-hidden="true" />
                Google Agenda
              </h3>
              <StatusPill estado={estadoGoogle} />
            </div>
            <p className="panel-card__text">
              Reuniões criadas pelo painel entram na agenda autorizada
              {google?.email ? ` (${google.email})` : ''}. A autorização é feita a partir do
              agendamento de uma reunião.
            </p>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <div className="panel-section__head">
          <h2 className="panel-section__title">Papéis e acesso</h2>
        </div>
        <div className="panel-cards">
          <article className="panel-card">
            <div className="panel-card__head">
              <h3 className="panel-card__title">Administrador</h3>
            </div>
            <p className="panel-card__text">
              Acessa esta área, gerencia usuários, clientes, projetos, permissões e o
              financeiro.
            </p>
          </article>
          <article className="panel-card">
            <div className="panel-card__head">
              <h3 className="panel-card__title">Equipe</h3>
            </div>
            <p className="panel-card__text">
              Vê a operação — board, diárias e carteira — com os projetos em que está
              atribuída. Não entra na Administração.
            </p>
          </article>
          <article className="panel-card">
            <div className="panel-card__head">
              <h3 className="panel-card__title">Cliente</h3>
            </div>
            <p className="panel-card__text">
              Vê apenas a própria conta: seus projetos, serviços contratados e cobranças. Não
              enxerga nada da operação nem de outros clientes.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
