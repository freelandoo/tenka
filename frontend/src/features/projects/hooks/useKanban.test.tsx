import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useKanban } from './useKanban';
import * as service from '../services/projectsService';
import type { BoardProject } from '../services/projectsService';

vi.mock('../services/projectsService', () => ({
  fetchBoard: vi.fn(),
  moveProject: vi.fn(),
}));

vi.mock('../../../lib/supabase/client', () => {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    isSupabaseConfigured: true,
    getSupabase: () => ({
      channel: () => channel,
      removeChannel: vi.fn(),
    }),
  };
});

function project(id: string, status: BoardProject['status'], position: number): BoardProject {
  return {
    id,
    name: `Projeto ${id}`,
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
    color_key: 'amarelo',
    position,
    finalized_at: null,
    created_by: null,
    created_at: '',
    updated_at: '',
    archived_at: null,
    assignees: [],
  };
}

const mockedFetch = vi.mocked(service.fetchBoard);
const mockedMove = vi.mocked(service.moveProject);

beforeEach(() => {
  vi.clearAllMocks();
  mockedFetch.mockResolvedValue([
    project('a', 'inicio', 0),
    project('b', 'inicio', 1),
    project('c', 'em_andamento', 0),
  ]);
});

describe('useKanban', () => {
  it('carrega o board agrupado por coluna e ordenado por posição', async () => {
    const { result } = renderHook(() => useKanban(true));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.columns.inicio.map((p) => p.id)).toEqual(['a', 'b']);
    expect(result.current.columns.em_andamento.map((p) => p.id)).toEqual(['c']);
    expect(result.current.columns.finalizado).toEqual([]);
  });

  it('move com atualização otimista e persiste via RPC', async () => {
    mockedMove.mockResolvedValue(undefined);
    const { result } = renderHook(() => useKanban(true));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      const outcome = await result.current.move('a', 'em_andamento', 1);
      expect(outcome.ok).toBe(true);
    });

    expect(mockedMove).toHaveBeenCalledWith('a', 'em_andamento', 1);
    expect(result.current.columns.inicio.map((p) => p.id)).toEqual(['b']);
    expect(result.current.columns.em_andamento.map((p) => p.id)).toEqual(['c', 'a']);
    // Posições renumeradas de forma densa.
    expect(result.current.columns.inicio[0].position).toBe(0);
    expect(result.current.columns.em_andamento.map((p) => p.position)).toEqual([0, 1]);
  });

  it('restaura o estado anterior quando a persistência falha (rollback)', async () => {
    mockedMove.mockRejectedValue(new Error('rede caiu'));
    const { result } = renderHook(() => useKanban(true));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const before = {
      inicio: result.current.columns.inicio.map((p) => p.id),
      em_andamento: result.current.columns.em_andamento.map((p) => p.id),
    };

    await act(async () => {
      const outcome = await result.current.move('b', 'finalizado', 0);
      expect(outcome.ok).toBe(false);
      expect(outcome.message).toMatch(/rede caiu|Falha/);
    });

    expect(result.current.columns.inicio.map((p) => p.id)).toEqual(before.inicio);
    expect(result.current.columns.em_andamento.map((p) => p.id)).toEqual(before.em_andamento);
    expect(result.current.columns.finalizado).toEqual([]);
  });
});
