import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteErrorBoundary } from './RouteErrorBoundary';

/**
 * Sem este boundary, um erro de rota esvazia o #root e a pessoa fica olhando
 * para o fundo laranja do index.html, sem mensagem e sem saída.
 */

function Explode({ mensagem }: { mensagem: string }): never {
  throw new Error(mensagem);
}

let erroSpy: ReturnType<typeof vi.spyOn>;
let recarregar: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // O React loga o erro capturado; silencia para o output do teste ficar limpo.
  erroSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  sessionStorage.clear();
  recarregar = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: recarregar },
  });
});
afterEach(() => {
  erroSpy.mockRestore();
  sessionStorage.clear();
});

describe('RouteErrorBoundary', () => {
  it('deixa passar quando não há erro', () => {
    render(
      <RouteErrorBoundary>
        <p>conteúdo normal</p>
      </RouteErrorBoundary>,
    );
    expect(screen.getByText('conteúdo normal')).toBeInTheDocument();
  });

  it('mostra tela de falha de CHUNK com a causa certa', () => {
    render(
      <RouteErrorBoundary>
        <Explode mensagem="Failed to fetch dynamically imported module: /assets/Dev-abc.js" />
      </RouteErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Não foi possível carregar esta página')).toBeInTheDocument();
    expect(screen.getByText(/aba fica em segundo plano/)).toBeInTheDocument();
    // E, principalmente, uma saída — não uma tela morta.
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para a home' })).toHaveAttribute('href', '/');
  });

  it('usa texto genérico para erro de render', () => {
    render(
      <RouteErrorBoundary>
        <Explode mensagem="Cannot read properties of undefined" />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText('Algo deu errado por aqui')).toBeInTheDocument();
    expect(screen.queryByText(/aba fica em segundo plano/)).toBeNull();
  });

  it('expõe a mensagem original nos detalhes técnicos', () => {
    render(
      <RouteErrorBoundary>
        <Explode mensagem="Loading chunk 12 failed" />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText('Loading chunk 12 failed')).toBeInTheDocument();
  });

  it('recarrega sozinho na PRIMEIRA falha de chunk — a recarga limpa o module map', () => {
    render(
      <RouteErrorBoundary>
        <Explode mensagem="Failed to fetch dynamically imported module" />
      </RouteErrorBoundary>,
    );
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('NÃO recarrega de novo na mesma sessão — guarda contra laço infinito', () => {
    sessionStorage.setItem('tenka:chunk-reload', '123');
    render(
      <RouteErrorBoundary>
        <Explode mensagem="Failed to fetch dynamically imported module" />
      </RouteErrorBoundary>,
    );
    expect(recarregar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('não recarrega em erro de render — ali recarregar não conserta nada', () => {
    render(
      <RouteErrorBoundary>
        <Explode mensagem="Cannot read properties of undefined" />
      </RouteErrorBoundary>,
    );
    expect(recarregar).not.toHaveBeenCalled();
  });
});
