import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { ProjectPostIt } from './ProjectPostIt';
import type { BoardProject } from '../services/projectsService';

const project: BoardProject = {
  id: 'proj-1',
  name: 'Campanha de lançamento',
  description: 'Descrição interna sigilosa',
  value_cents: 1250000,
  monthly_fee_cents: 0,
  subscription_active: false,
  client_name: 'Cliente Teste',
  client_phone: '11999999999',
  client_email: '',
  company: 'tenka',
  due_date: '2026-10-01',
  status: 'inicio',
  color_key: 'rosa',
  position: 0,
  finalized_at: null,
  created_by: 'admin-1',
  created_at: '2026-07-01T12:00:00Z',
  updated_at: '2026-07-01T12:00:00Z',
  archived_at: null,
  assignees: [
    { project_id: 'proj-1', user_id: 'u2', assigned_by: 'admin-1', assigned_at: '' },
  ],
};

function renderPostIt(overrides: Partial<Parameters<typeof ProjectPostIt>[0]> = {}) {
  const onOpenDetails = vi.fn();
  const onOpenNotes = vi.fn();
  render(
    <DndContext>
      <SortableContext items={[project.id]}>
        <ProjectPostIt
          project={project}
          onOpenDetails={onOpenDetails}
          onOpenNotes={onOpenNotes}
          {...overrides}
        />
      </SortableContext>
    </DndContext>,
  );
  return { onOpenDetails, onOpenNotes };
}

describe('ProjectPostIt', () => {
  it('mostra somente o nome e o botão OBS na frente do card', () => {
    renderPostIt();
    expect(screen.getByText('Campanha de lançamento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /observações do projeto/i })).toBeInTheDocument();

    // Nada de valor, descrição, prazo, status ou responsáveis na frente.
    expect(screen.queryByText(/12\.500/)).not.toBeInTheDocument();
    expect(screen.queryByText(/sigilosa/)).not.toBeInTheDocument();
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument();
    expect(screen.queryByText(/início/i)).not.toBeInTheDocument();
  });

  it('preserva a cor escolhida no atributo de tokens CSS', () => {
    renderPostIt();
    const card = document.querySelector('[data-project-id="proj-1"]');
    expect(card).toHaveAttribute('data-postit-color', 'rosa');
  });

  it('aplica inclinação determinística baseada no ID', () => {
    renderPostIt();
    const card = document.querySelector('[data-project-id="proj-1"]') as HTMLElement;
    const tilt = card.style.getPropertyValue('--postit-tilt');
    expect(tilt).toMatch(/deg$/);
    expect(Math.abs(parseFloat(tilt))).toBeLessThanOrEqual(1.5);
  });

  it('clicar no OBS abre observações sem abrir os detalhes', () => {
    const { onOpenDetails, onOpenNotes } = renderPostIt();
    fireEvent.click(screen.getByRole('button', { name: /observações do projeto/i }));
    expect(onOpenNotes).toHaveBeenCalledWith('proj-1');
    expect(onOpenDetails).not.toHaveBeenCalled();
  });

  it('clicar no corpo abre os detalhes', () => {
    const { onOpenDetails } = renderPostIt();
    fireEvent.click(screen.getByText('Campanha de lançamento'));
    expect(onOpenDetails).toHaveBeenCalledWith('proj-1');
  });

  it('recebe o destaque de notificação (scroll + classe de glow)', () => {
    renderPostIt({ highlighted: true, onClearHighlight: vi.fn() });
    const card = document.querySelector('[data-project-id="proj-1"]') as HTMLElement;
    expect(card.classList.contains('postit--highlight')).toBe(true);
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
