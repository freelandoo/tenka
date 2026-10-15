import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SmartLink, { isStandaloneAppHref } from './SmartLink';

describe('SmartLink', () => {
  it('reconhece os apps servidos fora do SPA', () => {
    expect(isStandaloneAppHref('/innovation-week')).toBe(true);
    expect(isStandaloneAppHref('/innovation-week/jogo')).toBe(true);
    expect(isStandaloneAppHref('/innovation-weekend')).toBe(false);
    expect(isStandaloneAppHref('/games')).toBe(false);
  });

  it('navega por documento para /innovation-week (não pelo router)', () => {
    render(
      <MemoryRouter>
        <SmartLink to="/innovation-week">IW</SmartLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'IW' });
    expect(link.getAttribute('href')).toBe('/innovation-week');
    expect(link.getAttribute('data-discover')).toBeNull();
  });
});
