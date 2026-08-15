import { describe, expect, it } from 'vitest';
import type { DailyTaskRow } from '../../../lib/supabase/database.types';
import { promoteOverduePlanning } from './useDailies';

function task(id: string, day: string, row_key: DailyTaskRow['row_key']): DailyTaskRow {
  return {
    id,
    day,
    row_key,
    title: id,
    description: '',
    color_key: 'amarelo',
    position: 0,
    project_id: null,
    assignee_id: null,
    created_by: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  };
}

describe('promoteOverduePlanning', () => {
  it('promotes only planning tasks from previous weeks to today', () => {
    const previousPlanning = task('previous-planning', '2026-08-07', 'planejamento');
    const previousExecution = task('previous-execution', '2026-08-07', 'execucao');
    const currentPlanning = task('current-planning', '2026-08-12', 'planejamento');

    const result = promoteOverduePlanning(
      [previousPlanning, previousExecution, currentPlanning],
      '2026-08-10',
      '2026-08-15',
    );

    expect(result.tasks.find((item) => item.id === previousPlanning.id)?.day).toBe('2026-08-15');
    expect(result.tasks.find((item) => item.id === previousExecution.id)?.day).toBe('2026-08-07');
    expect(result.tasks.find((item) => item.id === currentPlanning.id)?.day).toBe('2026-08-12');
    expect([...result.overdueTaskIds]).toEqual(['previous-planning']);
  });

  it('keeps all dates untouched outside the current week', () => {
    const previousPlanning = task('previous-planning', '2026-08-07', 'planejamento');
    const result = promoteOverduePlanning([previousPlanning], '2026-08-10', null);

    expect(result.tasks[0].day).toBe('2026-08-07');
    expect(result.overdueTaskIds.size).toBe(0);
  });
});
