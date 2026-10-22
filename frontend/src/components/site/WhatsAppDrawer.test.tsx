import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WhatsAppDrawer from './WhatsAppDrawer';

// o logo 3D não sobe no jsdom (sem WebGL): o teste fica no glifo CSS
vi.mock('./whatsapp3d/scene', () => ({ mountWhatsAppLogo: () => ({ spin() {}, destroy() {} }) }));

const dock = () => document.querySelector('.wa-dock')!;

describe('gaveta de WhatsApp', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('abre sozinha no primeiro scroll e não reabre na mesma sessão', () => {
    const { unmount } = render(<WhatsAppDrawer source="site_precos" />);
    expect(dock().classList.contains('is-open')).toBe(false);
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 400, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(dock().classList.contains('is-open')).toBe(true);
    unmount();

    render(<WhatsAppDrawer source="site_precos" />);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(dock().classList.contains('is-open')).toBe(false);
  });

  it('não pede dado nenhum: o caminho é direto para o WhatsApp', () => {
    const { container } = render(<WhatsAppDrawer source="site_precos" />);
    fireEvent.click(screen.getByRole('button', { name: /^ofertas de hoje/i }));
    expect(container.querySelector('input')).toBeNull();
    const cta = screen.getByRole('link', { name: /chamar no whatsapp/i });
    expect(cta.getAttribute('href')).toContain('wa.me/');
    expect(cta.getAttribute('target')).toBe('_blank');
  });

  it('quem já chamou não vê a gaveta abrir sozinha de novo', () => {
    const { unmount } = render(<WhatsAppDrawer source="site_precos" />);
    fireEvent.click(screen.getByRole('button', { name: /^ofertas de hoje/i }));
    fireEvent.click(screen.getByRole('link', { name: /chamar no whatsapp/i }));
    expect(window.localStorage.getItem('tenka.wa-drawer.sent')).toBe('1');
    unmount();

    window.sessionStorage.clear();
    render(<WhatsAppDrawer source="site_precos" />);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(dock().classList.contains('is-open')).toBe(false);
  });
});
