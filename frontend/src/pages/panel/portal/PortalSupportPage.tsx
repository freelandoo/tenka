import { Mail, MessageSquare, Phone } from 'lucide-react';
import { usePortalData } from '../../../features/portal/usePortalData';
import {
  PortalError,
  PortalHeader,
  PortalLoading,
} from '../../../features/portal/PortalPieces';

const SUPORTE_EMAIL = 'contato@tenka.com.br';

/**
 * Suporte — por onde o cliente fala com a TENKA.
 *
 * Os canais são os mesmos do site (e-mail e o formulário de contato): a inbox
 * do WhatsApp existe no painel, mas é a mesa da equipe (`/painel/atendimento`,
 * staff), não um chat que o cliente abre daqui.
 */
export default function PortalSupportPage() {
  const { status, client, refresh } = usePortalData();

  if (status === 'loading') return <PortalLoading />;
  if (status === 'error' || !client) return <PortalError onRetry={() => void refresh()} />;

  return (
    <>
      <PortalHeader
        eyebrow="Fale com a TENKA"
        title="Suporte"
        description="Dúvida sobre um projeto, uma cobrança ou um pedido novo? Use um dos canais abaixo — respondemos em horário comercial."
      />

      <div className="panel-cards">
        <article className="panel-card">
          <div className="panel-card__head">
            <h2 className="panel-card__title">E-mail</h2>
          </div>
          <p className="panel-card__text">
            O canal oficial para pedidos, aprovações e qualquer coisa que precise ficar
            registrada.
          </p>
          <a className="panel-btn panel-btn--primary" href={`mailto:${SUPORTE_EMAIL}`}>
            <Mail size={16} aria-hidden="true" />
            {SUPORTE_EMAIL}
          </a>
        </article>

        <article className="panel-card">
          <div className="panel-card__head">
            <h2 className="panel-card__title">Formulário de contato</h2>
          </div>
          <p className="panel-card__text">
            Prefere escrever pelo site? O formulário chega na mesma caixa de entrada da
            equipe.
          </p>
          <a className="panel-btn" href="/contato" target="_blank" rel="noreferrer">
            <MessageSquare size={16} aria-hidden="true" />
            Abrir formulário
          </a>
        </article>

        <article className="panel-card">
          <div className="panel-card__head">
            <h2 className="panel-card__title">Seus dados de contato</h2>
          </div>
          <p className="panel-card__text">
            É por aqui que a equipe fala com você. Algo desatualizado? Avise no suporte que
            corrigimos o cadastro.
          </p>
          <dl className="panel-card__grid">
            <div>
              <dt>Conta</dt>
              <dd>{client.name}</dd>
            </div>
            {client.email && (
              <div>
                <dt>E-mail</dt>
                <dd>{client.email}</dd>
              </div>
            )}
            {client.phone && (
              <div>
                <dt>
                  <Phone size={12} aria-hidden="true" /> Telefone
                </dt>
                <dd>{client.phone}</dd>
              </div>
            )}
          </dl>
        </article>
      </div>
    </>
  );
}
