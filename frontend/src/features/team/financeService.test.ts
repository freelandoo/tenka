import { describe, expect, it } from 'vitest';
import type { CostRow, ProjectRow } from '../../lib/supabase/database.types';
import {
  mesAnterior,
  saudeAtraso,
  saudeConcentracao,
  saudeCobertura,
  saudeMargem,
  saudeRecorrencia,
  summarize,
} from './financeService';

const project = (over: Partial<ProjectRow> = {}): ProjectRow => ({
  id: crypto.randomUUID(),
  name: 'Projeto',
  description: '',
  value_cents: 0,
  monthly_fee_cents: 0,
  subscription_active: false,
  client_id: null,
  client_name: 'Cliente A',
  client_phone: '',
  client_email: '',
  due_day: null,
  company: 'tenka',
  due_date: '2026-07-10',
  status: 'em_andamento',
  color_key: 'amarelo',
  position: 0,
  finalized_at: null,
  created_by: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  archived_at: null,
  ...over,
});

const cost = (over: Partial<CostRow> = {}): CostRow => ({
  id: crypto.randomUUID(),
  project_id: null,
  description: 'Custo',
  amount_cents: 0,
  kind: 'mensal',
  incurred_on: '2026-07-01',
  active: true,
  created_by: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  ...over,
});

const base = {
  headcount: 2,
  year: 2026,
  month: 7,
  today: '2026-07-25',
};

describe('summarize — receita', () => {
  it('reconhece o valor do projeto no mês da entrega e ignora os outros meses', () => {
    const s = summarize({
      ...base,
      costs: [],
      projects: [
        project({ value_cents: 500_000, due_date: '2026-07-03' }),
        project({ value_cents: 300_000, due_date: '2026-07-28' }),
        project({ value_cents: 900_000, due_date: '2026-08-01' }),
      ],
    });

    expect(s.receitaProjetos).toBe(800_000);
    expect(s.entregas).toBe(2);
  });

  it('soma só as mensalidades ativas no MRR e guarda as desligadas como receita parada', () => {
    const s = summarize({
      ...base,
      costs: [],
      projects: [
        project({ monthly_fee_cents: 100_000, subscription_active: true }),
        project({ monthly_fee_cents: 50_000, subscription_active: true }),
        project({ monthly_fee_cents: 80_000, subscription_active: false }),
      ],
    });

    expect(s.mrr).toBe(150_000);
    expect(s.recorrencia).toEqual({
      contratos: 3,
      ativos: 2,
      pct: (2 / 3) * 100,
      paradaCents: 80_000,
    });
  });

  it('compara com o mês anterior mantendo o MRR nos dois lados', () => {
    const s = summarize({
      ...base,
      costs: [],
      projects: [
        project({ value_cents: 400_000, due_date: '2026-07-10' }),
        project({ value_cents: 250_000, due_date: '2026-06-10' }),
        project({ monthly_fee_cents: 100_000, subscription_active: true }),
      ],
    });

    expect(s.receitaTotal).toBe(500_000);
    expect(s.receitaTotalAnterior).toBe(350_000);
  });

  it('vira o ano ao buscar o mês anterior de janeiro', () => {
    expect(mesAnterior('2026-01')).toBe('2025-12');
    expect(mesAnterior('2026-07')).toBe('2026-06');
  });
});

describe('summarize — custo e margem', () => {
  it('separa custo fixo (mensal) do único do mês e ignora o inativo', () => {
    const s = summarize({
      ...base,
      projects: [project({ value_cents: 1_000_000 })],
      costs: [
        cost({ kind: 'mensal', amount_cents: 200_000 }),
        cost({ kind: 'mensal', amount_cents: 90_000, active: false }),
        cost({ kind: 'unico', amount_cents: 60_000, incurred_on: '2026-07-14' }),
        cost({ kind: 'unico', amount_cents: 300_000, incurred_on: '2026-05-14' }),
      ],
    });

    expect(s.custoFixo).toBe(200_000);
    expect(s.custoVariavel).toBe(60_000);
    expect(s.custoTotal).toBe(260_000);
    expect(s.resultado).toBe(740_000);
    expect(s.margemPct).toBeCloseTo(74);
  });

  it('devolve null em vez de zero quando não há receita para dividir', () => {
    const s = summarize({ ...base, projects: [], costs: [cost({ amount_cents: 100_000 })] });

    expect(s.margemPct).toBeNull();
    expect(s.ticketMedio).toBeNull();
    expect(s.resultado).toBe(-100_000);
    // Existe custo fixo, então 0% de cobertura é resposta — não ausência dela.
    expect(s.coberturaPct).toBe(0);
  });

  it('não mede cobertura quando nenhum custo fixo foi lançado', () => {
    const s = summarize({ ...base, projects: [], costs: [] });
    expect(s.coberturaPct).toBeNull();
  });

  it('mede a cobertura do custo fixo pela recorrência', () => {
    const s = summarize({
      ...base,
      projects: [project({ monthly_fee_cents: 150_000, subscription_active: true })],
      costs: [cost({ kind: 'mensal', amount_cents: 200_000 })],
    });

    expect(s.coberturaPct).toBeCloseTo(75);
  });
});

describe('summarize — ticket, produtividade e carteira', () => {
  it('compara o ticket médio do mês com o do ano', () => {
    const s = summarize({
      ...base,
      costs: [],
      projects: [
        project({ value_cents: 600_000, due_date: '2026-07-10' }),
        project({ value_cents: 200_000, due_date: '2026-03-10' }),
      ],
    });

    expect(s.ticketMedio).toBe(600_000);
    expect(s.ticketMedioAno).toBe(400_000);
  });

  it('divide a receita do mês pelos colaboradores ativos', () => {
    const s = summarize({
      ...base,
      headcount: 4,
      costs: [],
      projects: [project({ value_cents: 800_000 })],
    });

    expect(s.receitaPorColaborador).toBe(200_000);
  });

  it('não divide por zero colaborador', () => {
    const s = summarize({ ...base, headcount: 0, costs: [], projects: [project({ value_cents: 1 })] });
    expect(s.receitaPorColaborador).toBeNull();
  });

  it('conta na carteira só o que não foi finalizado e marca o prazo vencido', () => {
    const s = summarize({
      ...base,
      costs: [],
      projects: [
        project({ value_cents: 400_000, due_date: '2026-08-10' }),
        project({ value_cents: 300_000, due_date: '2026-07-01' }), // vencido
        project({ value_cents: 900_000, due_date: '2026-06-01', finalized_at: '2026-06-02T10:00:00Z' }),
      ],
    });

    expect(s.carteira).toEqual({
      projetos: 2,
      valorCents: 700_000,
      atrasados: 1,
      atrasadoCents: 300_000,
    });
  });
});

describe('summarize — concentração de receita', () => {
  it('agrupa por cliente somando entregas do ano e 12 meses de recorrência ativa', () => {
    const s = summarize({
      ...base,
      costs: [],
      projects: [
        project({ client_id: 'c1', client_name: 'Alfa', value_cents: 600_000 }),
        project({
          client_id: 'c1',
          client_name: 'Alfa',
          value_cents: 0,
          monthly_fee_cents: 50_000,
          subscription_active: true,
        }),
        project({ client_id: 'c2', client_name: 'Beta', value_cents: 200_000 }),
      ],
    });

    // Alfa: 600k + 12×50k = 1.200k · Beta: 200k · total 1.400k
    expect(s.concentracao.topNome).toBe('Alfa');
    expect(s.concentracao.topCents).toBe(1_200_000);
    expect(s.concentracao.clientes).toBe(2);
    expect(s.concentracao.pct).toBeCloseTo((1_200_000 / 1_400_000) * 100);
  });

  it('separa projetos antigos sem client_id pelo nome espelhado', () => {
    const s = summarize({
      ...base,
      costs: [],
      projects: [
        project({ client_id: null, client_name: 'Alfa', value_cents: 100_000 }),
        project({ client_id: null, client_name: ' alfa ', value_cents: 100_000 }),
        project({ client_id: null, client_name: 'Beta', value_cents: 200_000 }),
      ],
    });

    expect(s.concentracao.clientes).toBe(2);
    expect(s.concentracao.topCents).toBe(200_000);
  });

  it('não elege ninguém quando não há receita no ano', () => {
    const s = summarize({ ...base, costs: [], projects: [project({ due_date: '2025-01-10' })] });

    expect(s.concentracao.topNome).toBe('');
    expect(s.concentracao.pct).toBeNull();
  });
});

describe('faixas de saúde', () => {
  it('classifica margem, cobertura e recorrência do maior para o menor', () => {
    expect(saudeMargem(25)).toBe('bom');
    expect(saudeMargem(12)).toBe('atencao');
    expect(saudeMargem(4)).toBe('critico');
    expect(saudeCobertura(120)).toBe('bom');
    expect(saudeCobertura(70)).toBe('atencao');
    expect(saudeRecorrencia(90)).toBe('bom');
    expect(saudeRecorrencia(20)).toBe('critico');
  });

  it('inverte a leitura da concentração — menor é melhor', () => {
    expect(saudeConcentracao(18)).toBe('bom');
    expect(saudeConcentracao(45)).toBe('atencao');
    expect(saudeConcentracao(70)).toBe('critico');
  });

  it('só considera a carteira em dia quando não há nada atrasado', () => {
    expect(saudeAtraso(0)).toBe('bom');
    expect(saudeAtraso(15)).toBe('atencao');
    expect(saudeAtraso(40)).toBe('critico');
  });

  it('fica neutro sem base para o cálculo', () => {
    expect(saudeMargem(null)).toBe('neutro');
    expect(saudeConcentracao(null)).toBe('neutro');
  });
});
