import {
  Building2,
  FolderKanban,
  LayoutDashboard,
  LayoutPanelLeft,
  LifeBuoy,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { PanelRole } from '../lib/supabase/database.types';

export interface PanelNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Só marca ativo no caminho exato (usado na raiz de /painel/admin). */
  end?: boolean;
}

export interface PanelNavGroup {
  /** Título do grupo na barra lateral. `null` = sem título. */
  label: string | null;
  items: PanelNavItem[];
}

/**
 * A navegação do Painel em UM lugar.
 *
 * A barra lateral e o menu do mobile leem daqui, e o papel decide o que existe.
 * Isto é a camada da INTERFACE: esconder um item nunca é a proteção — cada rota
 * ainda passa por <RequireStaff>/<RequireAdmin>, e a API por `staffOnly` /
 * `adminOnly`. Aqui é só para ninguém ver porta que não pode abrir.
 */
export function panelNavFor(role: PanelRole | null): PanelNavGroup[] {
  if (role === 'client') {
    return [
      {
        label: null,
        items: [
          { to: '/painel/visao-geral', label: 'Visão geral', icon: LayoutDashboard },
          { to: '/painel/meus-projetos', label: 'Meus projetos', icon: FolderKanban },
          { to: '/painel/suporte', label: 'Suporte', icon: LifeBuoy },
          { to: '/painel/configuracoes', label: 'Configurações', icon: Settings },
        ],
      },
    ];
  }

  const operacao: PanelNavGroup = {
    label: null,
    items: [
      { to: '/painel/projetos', label: 'Projetos', icon: FolderKanban },
      ...(role === 'admin'
        ? [{ to: '/painel/atendimento', label: 'Atendimento', icon: MessageSquare }]
        : []),
      { to: '/painel/configuracoes', label: 'Configurações', icon: Settings },
    ],
  };

  if (role !== 'admin') return [operacao];

  return [
    operacao,
    {
      label: 'Administração',
      items: [
        { to: '/painel/admin', label: 'Visão geral', icon: ShieldCheck, end: true },
        { to: '/painel/admin/clientes', label: 'Clientes', icon: Building2 },
        { to: '/painel/admin/usuarios', label: 'Usuários', icon: Users },
        { to: '/painel/admin/financeiro', label: 'Financeiro', icon: Wallet },
        { to: '/painel/admin/site', label: 'Site', icon: LayoutPanelLeft },
        { to: '/painel/admin/configuracoes', label: 'Configurações', icon: Settings },
      ],
    },
  ];
}
