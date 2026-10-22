/**
 * As três divisões na pele tabloide — fonte única das cores. Cada página
 * escolhe a sua com `data-division` no invólucro `.tf-root`, e o CSS lê
 * `--tf-acc` daí; aqui fica a mesma cor para quem precisa dela em JS (canvas,
 * holograma).
 */
import type { DivisionId } from '../pricing/plans';

export interface Division {
  id: DivisionId;
  name: string;
  short: string;
  accent: string;
  to: string;
  line: string;
}

export const DIVISIONS: Record<DivisionId, Division> = {
  tech: {
    id: 'tech',
    name: 'TENKA Tech',
    short: 'Tech',
    accent: '#00D9E0',
    to: '/tech',
    line: 'Sites, sistemas, apps e automações',
  },
  studios: {
    id: 'studios',
    name: 'TENKA Studios',
    short: 'Studios',
    accent: '#E0262F',
    to: '/studios',
    line: '3D, animação, branding e identidade',
  },
  games: {
    id: 'games',
    name: 'TENKA Games',
    short: 'Games',
    accent: '#FF6A0A',
    to: '/games',
    line: 'Jogos, VR e experiências interativas',
  },
};

export const DIVISION_LIST: Division[] = [DIVISIONS.tech, DIVISIONS.studios, DIVISIONS.games];
