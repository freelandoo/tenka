import type { PostItColorKey } from '../../../lib/supabase/database.types';
import { POSTIT_COLOR_KEYS, POSTIT_COLOR_LABELS } from '../colors';

interface PostItColorPickerProps {
  value: PostItColorKey | null;
  onChange(key: PostItColorKey): void;
  idPrefix?: string;
}

/** Amostras reais das cores da paleta (tokens CSS), com estado selecionado. */
export function PostItColorPicker({ value, onChange, idPrefix = 'color' }: PostItColorPickerProps) {
  return (
    <div className="color-picker" role="group" aria-label="Cor do post-it">
      {POSTIT_COLOR_KEYS.map((key) => (
        <button
          key={key}
          id={`${idPrefix}-${key}`}
          type="button"
          className="color-picker__swatch"
          data-postit-color={key}
          aria-pressed={value === key}
          aria-label={`Cor ${POSTIT_COLOR_LABELS[key]}${value === key ? ' (selecionada)' : ''}`}
          title={POSTIT_COLOR_LABELS[key]}
          onClick={() => onChange(key)}
        />
      ))}
    </div>
  );
}
