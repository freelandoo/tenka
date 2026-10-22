import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WhatsAppDrawer from './WhatsAppDrawer';

const saveLead = vi.fn(async () => true);
vi.mock('../../lib/api/leads', () => ({ saveLead: (...args: unknown[]) => saveLead(...(args as [])) }));

function dock() {
  return document.querySelector('.wa-dock')!;
}

describe('gaveta de WhatsApp', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    saveLead.mockClear();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });
  afterEach(() => vi.restoreAllMocks());

  it('abre sozinha no primeiro scroll e não reabre na mesma sessão', () => {
    const { unmount } = render(<WhatsAppDrawer source="precos_whatsapp" division="tech" />);
    expect(dock().classList.contains('is-open')).toBe(false);
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 400, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(dock().classList.contains('is-open')).toBe(true);
    unmount();

    render(<WhatsAppDrawer source="precos_whatsapp" division="tech" />);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(dock().classList.contains('is-open')).toBe(false);
  });

  it('exige nome e WhatsApp com DDD antes de chamar', () => {
    render(<WhatsAppDrawer source="precos_whatsapp" division="tech" />);
    fireEvent.click(screen.getByRole('button', { name: /^ofertas de hoje/i }));
    fireEvent.click(screen.getByRole('button', { name: /^chamar no whatsapp/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/nome/i);
    expect(window.open).not.toHaveBeenCalled();
    expect(saveLead).not.toHaveBeenCalled();
  });

  it('abre o WhatsApp no clique e grava o lead com o telefone', () => {
    const { container } = render(<WhatsAppDrawer source="precos_whatsapp" division="tech" />);
    fireEvent.change(container.querySelector('input[name="name"]')!, { target: { value: 'Ana' } });
    fireEvent.change(container.querySelector('input[name="phone"]')!, { target: { value: '(11) 98888-7777' } });
    fireEvent.click(screen.getByRole('button', { name: /^ofertas de hoje/i }));
    fireEvent.click(screen.getByRole('button', { name: /^chamar no whatsapp/i }));

    expect(window.open).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(window.open).mock.calls[0][0])).toContain('wa.me/');
    expect(saveLead).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'precos_whatsapp',
        name: 'Ana',
        answers: expect.objectContaining({ whatsapp: '11988887777' }),
      }),
    );
    expect(window.localStorage.getItem('tenka.wa-drawer.sent')).toBe('1');
  });
});
