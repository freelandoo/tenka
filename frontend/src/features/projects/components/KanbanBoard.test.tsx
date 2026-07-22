import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { KanbanBoard } from './KanbanBoard';
import type { BoardProject } from '../services/projectsService';
import type { ProjectStatus } from '../../../lib/supabase/database.types';

function project(
  id: string,
  name: string,
  status: BoardProject['status'],
  position: number,
  colorKey: BoardProject['color_key'] = 'verde',
): BoardProject {
  return {
    id,
    name,
    description: '',
    value_cents: 0,
    monthly_fee_cents: 0,
    subscription_active: false,
    client_name: '',
    client_phone: '',
    client_email: '',
    company: 'tenka',
    due_date: '2026-12-01',
    status,
    color_key: colorKey,
    position,
    finalized_at: null,
    created_by: null,
    created_at: '',
    updated_at: '',
    archived_at: null,
    assignees: [],
  };
}

function renderBoard(projects: BoardProject[]) {
  const columns: Record<ProjectStatus, BoardProject[]> = {
    inicio: projects.filter((p) => p.status === 'inicio'),
    em_andamento: projects.filter((p) => p.status === 'em_andamento'),
    finalizado: projects.filter((p) => p.status === 'finalizado'),
  };
  render(
    <KanbanBoard
      columns={columns}
      projectById={new Map(projects.map((p) => [p.id, p]))}
      onMove={vi.fn()}
      onOpenDetails={vi.fn()}
      onOpenNotes={vi.fn()}
      highlightedId={null}
      onClearHighlight={vi.fn()}
    />,
  );
}

describe('KanbanBoard', () => {
  it('renderiza as três colunas do mural', () => {
    renderBoard([]);
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Em andamento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Finalizado' })).toBeInTheDocument();
  });

  it('mostra estado vazio em colunas sem projetos', () => {
    renderBoard([]);
    expect(screen.getAllByText('Vazio')).toHaveLength(3);
  });

  it('um projeto recém-criado (status inicio) aparece na coluna Início', () => {
    renderBoard([project('novo', 'Projeto Recém-Criado', 'inicio', 0, 'ciano')]);
    const colInicio = screen.getByRole('region', { name: /coluna início/i });
    expect(within(colInicio).getByText('Projeto Recém-Criado')).toBeInTheDocument();

    const colAndamento = screen.getByRole('region', { name: /coluna em andamento/i });
    expect(within(colAndamento).queryByText('Projeto Recém-Criado')).not.toBeInTheDocument();

    // A cor escolhida na criação é preservada no card.
    const card = document.querySelector('[data-project-id="novo"]');
    expect(card).toHaveAttribute('data-postit-color', 'ciano');
  });

  it('projetos podem estar em Em andamento e mantêm a ordem por posição', () => {
    renderBoard([
      project('p1', 'Primeiro', 'em_andamento', 0),
      project('p2', 'Segundo', 'em_andamento', 1),
    ]);
    const col = screen.getByRole('region', { name: /coluna em andamento/i });
    const names = within(col)
      .getAllByText(/Primeiro|Segundo/)
      .map((el) => el.textContent);
    expect(names).toEqual(['Primeiro', 'Segundo']);
  });
});
