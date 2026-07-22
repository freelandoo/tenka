import type { PostItColorKey } from '../../lib/supabase/database.types';

/**
 * Paleta oficial dos post-its. O banco só aceita estas chaves (CHECK
 * constraint) e todos os estilos vivem em tokens CSS
 * (`[data-postit-color='…']` em src/styles/panel.css) — o cliente nunca
 * envia estilos arbitrários.
 */
export const POSTIT_COLOR_KEYS: readonly PostItColorKey[] = [
  'amarelo',
  'azul',
  'verde',
  'rosa',
  'laranja',
  'roxo',
  'ciano',
  'coral',
] as const;

export const POSTIT_COLOR_LABELS: Record<PostItColorKey, string> = {
  amarelo: 'Amarelo',
  azul: 'Azul',
  verde: 'Verde',
  rosa: 'Rosa',
  laranja: 'Laranja',
  roxo: 'Roxo',
  ciano: 'Ciano',
  coral: 'Coral',
};

export function isPostItColorKey(value: string): value is PostItColorKey {
  return (POSTIT_COLOR_KEYS as readonly string[]).includes(value);
}

/**
 * Hash determinístico (FNV-1a) do ID do projeto → variações físicas do
 * post-it. O mesmo projeto tem SEMPRE a mesma inclinação/deslocamento,
 * em qualquer render e em qualquer máquina.
 */
export function hashProjectId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface PostItPhysicality {
  /** Rotação em graus, no intervalo [-1.5, 1.5]. */
  tilt: number;
  /** Deslocamento horizontal em px, no intervalo [-3, 3]. */
  shift: number;
  /** Variação de textura 0..3 (usada para alternar o ângulo do grão). */
  grain: number;
}

export function postItPhysicality(id: string): PostItPhysicality {
  const hash = hashProjectId(id);
  const tilt = ((hash % 1000) / 1000 - 0.5) * 3; // -1.5º .. +1.5º
  const shift = (((hash >>> 10) % 1000) / 1000 - 0.5) * 6; // -3px .. +3px
  const grain = (hash >>> 20) % 4;
  return { tilt: Math.round(tilt * 100) / 100, shift: Math.round(shift * 100) / 100, grain };
}
