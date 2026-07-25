import { useState } from 'react';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import type { CostKind, CostRow } from '../../lib/supabase/database.types';
import { formatCurrencyFromCents } from '../panel/format';
import { useToast } from '../panel/ToastContext';
import * as service from './clientsService';

interface CostListProps {
  costs: CostRow[];
  /** `null` = custos da empresa (Carteira); id = custos daquele projeto. */
  projectId: string | null;
  onChanged(): void;
  /** Some com o formulário quando o usuário não pode lançar aqui. */
  readOnly?: boolean;
}

const KIND_LABEL: Record<CostKind, string> = {
  unico: 'Único',
  mensal: 'Mensal',
};

/** "1.234,56" → 123456 centavos. Aceita o que a pessoa digitar de verdade. */
function parseCents(raw: string): number {
  const clean = raw.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const value = Number(clean);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : 0;
}

/**
 * Lista de custos com lançamento inline. Mesma peça para custo de projeto e
 * custo da empresa — a única diferença é o `projectId` (nulo = empresa).
 *
 * Desativar não apaga: a linha continua no histórico, cinza, fora da soma. O
 * lixeira é para lançamento errado.
 */
export function CostList({ costs, projectId, onChanged, readOnly }: CostListProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<CostKind>(projectId ? 'unico' : 'mensal');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const total = service.sumActiveCosts(costs);

  const add = async () => {
    const text = description.trim();
    const cents = parseCents(amount);
    if (!text || cents <= 0 || saving) return;
    setSaving(true);
    try {
      await service.createCost({ projectId, description: text, amountCents: cents, kind });
      setDescription('');
      setAmount('');
      onChanged();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao lançar o custo.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (cost: CostRow) => {
    setBusyId(cost.id);
    try {
      await service.updateCost(cost.id, { active: !cost.active });
      onChanged();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao alterar o custo.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (cost: CostRow) => {
    setBusyId(cost.id);
    try {
      await service.deleteCost(cost.id);
      onChanged();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao excluir o custo.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="costs">
      {costs.length === 0 ? (
        <p className="costs__empty">
          {projectId ? 'Nenhum custo lançado neste projeto.' : 'Nenhum custo da empresa lançado.'}
        </p>
      ) : (
        <ul className="costs__list">
          {costs.map((cost) => (
            <li key={cost.id} className={`costs__row${cost.active ? '' : ' is-off'}`}>
              <span className="costs__desc">{cost.description}</span>
              <span className={`costs__kind costs__kind--${cost.kind}`}>
                {KIND_LABEL[cost.kind]}
              </span>
              <span className="costs__amount">
                {formatCurrencyFromCents(cost.amount_cents)}
                {cost.kind === 'mensal' && <small>/mês</small>}
              </span>
              {!readOnly && (
                <>
                  <button
                    type="button"
                    className={`costs__toggle${cost.active ? ' is-on' : ''}`}
                    disabled={busyId === cost.id}
                    aria-pressed={cost.active}
                    title={cost.active ? 'Desativar (sai da soma)' : 'Reativar'}
                    onClick={() => void toggle(cost)}
                  >
                    {cost.active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    type="button"
                    className="panel-iconbtn costs__del"
                    disabled={busyId === cost.id}
                    aria-label={`Excluir ${cost.description}`}
                    title="Excluir lançamento"
                    onClick={() => void remove(cost)}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="costs__total">
        <span>Total ativo</span>
        <strong>{formatCurrencyFromCents(total)}</strong>
      </div>

      {!readOnly && (
        <div className="costs__form">
          <input
            className="panel-input"
            placeholder="Descrição (ex.: licença do plugin)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Descrição do custo"
          />
          <input
            className="panel-input costs__form-amount"
            placeholder="0,00"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Valor do custo"
          />
          <select
            className="panel-select costs__form-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as CostKind)}
            aria-label="Tipo do custo"
          >
            <option value="unico">Único</option>
            <option value="mensal">Mensal</option>
          </select>
          <button
            type="button"
            className="panel-btn panel-btn--sm"
            disabled={saving || description.trim() === '' || parseCents(amount) <= 0}
            onClick={() => void add()}
          >
            {saving ? (
              <LoaderCircle
                size={14}
                aria-hidden="true"
                style={{ animation: 'panel-spin 900ms linear infinite' }}
              />
            ) : (
              <Plus size={14} aria-hidden="true" />
            )}
            Lançar
          </button>
        </div>
      )}
    </div>
  );
}
