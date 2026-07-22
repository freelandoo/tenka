export type CardRole = 'center' | 'previous' | 'next';

export interface CardRoleVars {
  left: string;
  top: string;
  xPercent: number;
  yPercent: number;
  scale: number;
  rotationY: number;
  rotationZ: number;
  opacity: number;
  filter: string;
  zIndex: number;
}

const DESKTOP_ROLES: Record<CardRole, CardRoleVars> = {
  center: {
    left: '50%',
    top: '56%',
    xPercent: -50,
    yPercent: -50,
    scale: 1,
    rotationY: 0,
    rotationZ: 0,
    opacity: 1,
    filter: 'blur(0px)',
    zIndex: 30,
  },
  previous: {
    left: '12%',
    top: '54%',
    xPercent: -50,
    yPercent: -50,
    scale: 0.6,
    rotationY: 18,
    rotationZ: -3,
    opacity: 0.72,
    filter: 'blur(2px)',
    zIndex: 15,
  },
  next: {
    left: '88%',
    top: '54%',
    xPercent: -50,
    yPercent: -50,
    scale: 0.6,
    rotationY: -18,
    rotationZ: 3,
    opacity: 0.72,
    filter: 'blur(2px)',
    zIndex: 15,
  },
};

const MOBILE_ROLES: Record<CardRole, CardRoleVars> = {
  center: {
    left: '50%',
    top: '48%',
    xPercent: -50,
    yPercent: -50,
    scale: 1,
    rotationY: 0,
    rotationZ: 0,
    opacity: 1,
    filter: 'blur(0px)',
    zIndex: 30,
  },
  previous: {
    left: '-6%',
    top: '50%',
    xPercent: -50,
    yPercent: -50,
    scale: 0.52,
    rotationY: 12,
    rotationZ: -2,
    opacity: 0.5,
    filter: 'blur(2px)',
    zIndex: 15,
  },
  next: {
    left: '106%',
    top: '50%',
    xPercent: -50,
    yPercent: -50,
    scale: 0.52,
    rotationY: -12,
    rotationZ: 2,
    opacity: 0.5,
    filter: 'blur(2px)',
    zIndex: 15,
  },
};

export function getRoleVars(role: CardRole, isMobile: boolean): CardRoleVars {
  return (isMobile ? MOBILE_ROLES : DESKTOP_ROLES)[role];
}

/** Resolves which showroom slot a slide occupies for a given active index. */
export function getCardRole(
  index: number,
  activeIndex: number,
  total: number,
): CardRole {
  if (index === activeIndex || total === 1) return 'center';
  if (index === (activeIndex + 1) % total) return 'next';
  return 'previous';
}

/**
 * Role vars prepared for tweening: z-index is handled with `set()` at exact
 * timeline positions (never tweened), and x/y are reset so an interrupted
 * entrance animation can't leave a stray translation behind.
 */
export function toTweenVars(vars: CardRoleVars): Omit<CardRoleVars, 'zIndex'> & {
  x: number;
  y: number;
} {
  const { zIndex, ...rest } = vars;
  void zIndex;
  return { ...rest, x: 0, y: 0 };
}
