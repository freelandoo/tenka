import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  FolderKanban,
  LayoutPanelLeft,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { fetchClients } from '../../../features/clients/clientsService';
import * as usersService from '../../../features/users/usersService';
import { useAdminBoardData } from '../../../features/admin/useAdminBoardData';
import { cents, formatCurrencyFromCents } from '../../../features/panel/format';

interface AdminCounts {
  clients: number;
  users: number;
  admins: number;
  clientAccounts: number;
}

const ATALHOS = [
  {
    to: '/painel/admin/clientes',
    icon: Building2,
    title: 'Clientes',
    text: 'Cadastro, projetos, cobranças e custos de cada cliente.',
  },
  {
    to: '/painel/admin/usuarios',
    icon: Users,
    title: 'Usuários',
    text: 'Contas da equipe e dos clientes, funções e acesso ao painel.',
  },
  {
    to: '/painel/projetos',
    icon: FolderKanban,
    title: 'Projetos',
    text: 'O board da operação: Kanban, diárias, carteira e equipe.',
  },
  {
    to: '/painel/admin/financeiro',
    icon: Wallet,
    title: 'Financeiro',
    text: 'Receita de projetos, mensalidades ativas e recebimentos do mês.',
  },
  {
    to: '/painel/admin/site',
    icon: LayoutPanelLeft,
    title: 'Site',
    text: 'Conteúdo do hero da home — o que o visitante vê primeiro.',
  },
  {
    to: '/painel/admin/configuracoes',
    icon: ShieldCheck,
    title: 'Configurações',
    text: 'Integrações da plataforma e como os papéis funcionam.',
  },
];

/**
 * Administração — a porta da área interna que saiu do site público.
 *
 * Números do topo e atalhos para as seções. Tudo aqui já depende de rotas que o
 * backend fecha em `adminOnly`: quem não é admin nem chega a ver esta tela
 * (RequireAdmin), e se chamasse a API direto levaria 403.
 */
export default function AdminHomePage() {
  const { status, projects } = useAdminBoardData();
  const [counts, setCounts] = useState<AdminCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchClients(), usersService.fetchUsers()])
      .then(([clients, users]) => {
        if (cancelled) return;
        setCounts({
          clients: clients.length,
          users: users.filter((u) => u.role !== 'client' && u.active).length,
          admins: users.filter((u) => u.role === 'admin' && u.active).length,
          clientAccounts: users.filter((u) => u.role === 'client' && u.active).length,
        });
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const receita = useMemo(() => {
    const ativos = projects.filter((p) => !p.finalized_at);
    const mensal = projects
      .filter((p) => p.subscription_active)
      .reduce((total, p) => total + cents(p.monthly_fee_cents), 0);
    return { ativos: ativos.length, mensal };
  }, [projects]);

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
          Área interna
        </p>
        <h1 style={{ fontSize: 23, fontWeight: 700 }}>Administração</h1>
        <p
          style={{
            fontSize: 13.5,
            color: 'var(--panel-text-dim)',
            marginTop: 6,
            maxWidth: 640,
            lineHeight: 1.55,
          }}
        >
          Gestão da plataforma TENKA: clientes, contas, projetos, financeiro e configurações.
          Visível apenas para administradores.
        </p>
      </header>

      <div className="panel-stats">
        <div className="panel-stat">
          <p className="panel-stat__label">Clientes</p>
          <p className="panel-stat__value">{counts ? counts.clients : '—'}</p>
          <p className="panel-stat__hint">
            {counts ? `${counts.clientAccounts} com acesso ao painel` : 'Carregando…'}
          </p>
        </div>
        <div className="panel-stat">
          <p className="panel-stat__label">Contas da equipe</p>
          <p className="panel-stat__value">{counts ? counts.users : '—'}</p>
          <p className="panel-stat__hint">
            {counts ? `${counts.admins} administrador(es)` : 'Carregando…'}
          </p>
        </div>
        <div className="panel-stat">
          <p className="panel-stat__label">Projetos ativos</p>
          <p className="panel-stat__value">{status === 'ready' ? receita.ativos : '—'}</p>
          <p className="panel-stat__hint">Fora do histórico</p>
        </div>
        <div className="panel-stat">
          <p className="panel-stat__label">Mensalidades ativas</p>
          <p className="panel-stat__value">
            {status === 'ready' ? formatCurrencyFromCents(receita.mensal) : '—'}
          </p>
          <p className="panel-stat__hint">Receita recorrente do mês</p>
        </div>
      </div>

      <section style={{ marginTop: 30 }}>
        <div className="panel-section__head">
          <h2 className="panel-section__title">Seções</h2>
        </div>
        <div className="panel-cards">
          {ATALHOS.map(({ to, icon: Icon, title, text }) => (
            <Link key={to} to={to} className="panel-card panel-card--link">
              <div className="panel-card__head">
                <h3 className="panel-card__title">
                  <Icon size={16} aria-hidden="true" />
                  {title}
                </h3>
                <ArrowRight size={16} aria-hidden="true" className="panel-card__arrow" />
              </div>
              <p className="panel-card__text">{text}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
