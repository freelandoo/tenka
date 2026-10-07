import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import SobrePage from './pages/SobrePage';
import ProjetosPage from './pages/ProjetosPage';
import ServicePage from './pages/ServicePage';
import NotFoundPage from './pages/NotFoundPage';
import { SERVICE_ROUTES } from './seo/services';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { usePageviews } from './lib/usePageviews';

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
  usePageviews();

  return (
    // Envolve TODAS as rotas: um erro que escape aqui deixaria o #root vazio, e
    // o usuário veria só o fundo laranja do index.html, sem nada para fazer.
    <RouteErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* A antiga área /admin era pública e sem autenticação. Ela virou
            /painel/admin (login + papel de admin); o redirecionamento fica
            aqui para não deixar link antigo em 404 — e para que digitar a URL
            à mão caia no painel, que sabe quem pode entrar. */}
        <Route path="/admin/*" element={<Navigate to="/painel/admin" replace />} />
        <Route
          path="/games"
          element={
            <Suspense fallback={<GamesFallback />}>
              <GamesPage />
            </Suspense>
          }
        />
        {/* /multimidia e /desenvolvimento serviam o MESMO componente de
            /studios e /tech, em URLs diferentes e sem canonical — conteúdo
            duplicado por construção. Agora são 301 no edge (vercel.json); estes
            Navigate cobrem navegação interna e o `npm run dev`, onde não há
            redirect do Vercel. */}
        <Route path="/multimidia" element={<Navigate to="/studios" replace />} />
        <Route path="/desenvolvimento" element={<Navigate to="/tech" replace />} />
        <Route
          path="/studios"
          element={
            <Suspense fallback={<MultimediaFallback />}>
              <MultimidiaPage />
            </Suspense>
          }
        />
        <Route
          path="/tech"
          element={
            <Suspense fallback={<TechnologyFallback />}>
              <DesenvolvimentoPage />
            </Suspense>
          }
        />
        {/* Páginas de serviço — uma URL por intenção comercial. Todas usam o
            mesmo template; o conteúdo vem de seo/services.ts, e o ServicePage
            resolve qual é pelo pathname. */}
        {SERVICE_ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={<ServicePage />} />
        ))}
        <Route path="/sobre" element={<SobrePage />} />
        <Route path="/projetos" element={<ProjetosPage />} />
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
