import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminHeroPage from './pages/AdminHeroPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { lazyWithRetry } from './lib/lazyWithRetry';

// The Games experience bundles Three.js/GSAP/Lenis — lazy-loaded so the rest
// of the site pays nothing for it.
//
// `lazyWithRetry` e não `lazy`: numa aba em segundo plano o Chrome aborta o
// download do chunk, e um `lazy` cru derruba a árvore inteira quando isso
// acontece — a tela some e sobra o laranja do index.html.
const GamesPage = lazyWithRetry(() => import('./pages/GamesPage'));
const DesenvolvimentoPage = lazyWithRetry(() => import('./pages/DesenvolvimentoPage'));
const MultimidiaPage = lazyWithRetry(() => import('./pages/MultimidiaPage'));

// Área interna (autenticação + Kanban de projetos) — chunk independente,
// nenhum custo para as experiências públicas.
const PanelRoutes = lazyWithRetry(() => import('./pages/panel/PanelRoutes'));

function PanelFallback() {
  return (
    <div
      style={{ backgroundColor: '#08090d', color: '#9aa0af' }}
      className="flex min-h-[100dvh] items-center justify-center"
    >
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.3em', fontSize: 11 }}>
        ABRINDO PAINEL TENKA...
      </p>
    </div>
  );
}

function GamesFallback() {
  return (
    <div
      style={{ backgroundColor: '#050505', color: '#98989F' }}
      className="flex min-h-screen items-center justify-center"
    >
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.3em', fontSize: 11 }}>
        CARREGANDO TENKA SYSTEM...
      </p>
    </div>
  );
}

function TechnologyFallback() {
  return (
    <div
      style={{ backgroundColor: '#020708', color: '#8BA3A0' }}
      className="flex min-h-[100dvh] items-center justify-center"
    >
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.3em', fontSize: 11 }}>
        INICIALIZANDO BUILD ENGINE...
      </p>
    </div>
  );
}

function MultimediaFallback() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0b0d] text-[#aaa8a6]"><p style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.3em', fontSize: 11 }}>ABRINDO TENKA STUDIOS...</p></div>;
}

export default function App() {
  return (
    // Envolve TODAS as rotas: um erro que escape aqui deixaria o #root vazio, e
    // o usuário veria só o fundo laranja do index.html, sem nada para fazer.
    <RouteErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin/hero" element={<AdminHeroPage />} />
        <Route
          path="/games"
          element={
            <Suspense fallback={<GamesFallback />}>
              <GamesPage />
            </Suspense>
          }
        />
        <Route
          path="/multimidia"
          element={
            <Suspense fallback={<MultimediaFallback />}>
              <MultimidiaPage />
            </Suspense>
          }
        />
        <Route
          path="/studios"
          element={
            <Suspense fallback={<MultimediaFallback />}>
              <MultimidiaPage />
            </Suspense>
          }
        />
        <Route
          path="/desenvolvimento"
          element={
            <Suspense fallback={<TechnologyFallback />}>
              <DesenvolvimentoPage />
            </Suspense>
          }
        />
        <Route path="/contato" element={<ContactPage />} />
        <Route
          path="/painel/*"
          element={
            <Suspense fallback={<PanelFallback />}>
              <PanelRoutes />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </RouteErrorBoundary>
  );
}
