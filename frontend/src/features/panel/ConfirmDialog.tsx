import { useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PanelOverlay } from './PanelOverlay';

/**
 * Confirmação de ação financeira.
 *
 * `window.confirm` dava conta de perguntar "tem certeza?", mas não de mostrar
 * o que exatamente vai acontecer — valor, cobrança, data — nem de deixar o
 * admin corrigir a data do recebimento antes de mandar. Numa baixa manual, que
 * hoje não tem desfazer, ver os números antes de confirmar é a única proteção.
 */

export interface ConfirmDetail {
  label: string;
  value: string;
}

interface ConfirmDialogProps {
  title: string;
  /** Texto de apoio; o que a ação faz e o que ela não faz. */
  description: ReactNode;
  details?: ConfirmDetail[];
  /** Quando presente, o valor confirmado sai com a data escolhida aqui. */
  dateField?: { label: string; value: string; max?: string };
  textField?: { label: string; value?: string; placeholder?: string; minLength?: number };
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** Aviso destacado para o que não tem volta. */
  warning?: string;
  busy?: boolean;
  onConfirm(date: string, text: string): void;
  onCancel(): void;
}

export function ConfirmDialog({
  title, description, details = [], dateField, textField, confirmLabel,
  tone = 'primary', warning, busy = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [date, setDate] = useState(dateField?.value ?? '');
  const [text, setText] = useState(textField?.value ?? '');
  const canConfirm = !busy && (!dateField || date !== '')
    && (!textField || text.trim().length >= (textField.minLength ?? 1));

  return (
    <PanelOverlay variant="modal" labelledBy="confirm-dialog-title" onClose={onCancel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 id="confirm-dialog-title" style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>

        <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--panel-text-dim)' }}>
          {description}
        </div>

        {details.length > 0 && (
          <dl className="confirm-dialog__details">
            {details.map((detail) => (
              <div key={detail.label} className="confirm-dialog__detail">
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {dateField && (
          <label className="confirm-dialog__field">
            <span>{dateField.label}</span>
            <input
              className="panel-input" type="date" value={date} max={dateField.max}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        )}

        {textField && (
          <label className="confirm-dialog__field">
            <span>{textField.label}</span>
            <textarea className="panel-input" value={text} placeholder={textField.placeholder}
              onChange={(event) => setText(event.target.value)} />
          </label>
        )}

        {warning && (
          <p className="confirm-dialog__warning" role="note">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{warning}</span>
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 2 }}>
          <button type="button" className="panel-btn panel-btn--ghost"
            disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`panel-btn ${tone === 'danger' ? 'panel-btn--danger' : 'panel-btn--primary'}`}
            disabled={!canConfirm}
            onClick={() => onConfirm(date, text.trim())}
          >
            {busy ? 'Enviando…' : confirmLabel}
          </button>
        </div>
      </div>
    </PanelOverlay>
  );
}
