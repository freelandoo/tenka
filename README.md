# TENKA — Monorepo

Site institucional + Painel interno da TENKA, dividido em dois deploys
independentes:

```
TENKA/
├─ frontend/   → SPA Vite/React (deploy no Vercel)
├─ backend/    → API Node/Fastify + Postgres (deploy no Railway)
├─ supabase/   → legado (backend antigo; migrations sendo portadas p/ backend/)
└─ docs/       → documentação (ver o plano da migração abaixo)
```

## Estado da migração

Em andamento: **corte do Supabase** e split front/back. Plano completo,
fases e decisões em **[docs/MIGRACAO-VERCEL-RAILWAY.md](docs/MIGRACAO-VERCEL-RAILWAY.md)**.

Concluído até aqui:
- **F0** — repositório reorganizado em `frontend/` + `backend/`.
- **F1** — esqueleto do backend: Fastify escutando em `$PORT`, `/health`,
  conexão Postgres e runner de migrations (`schema_migrations` + advisory lock).

## Rodando localmente

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
cp .env.example .env        # ajuste DATABASE_URL
npm run dev                 # sobe a API (health em /health)
npm run migrate             # aplica migrations manualmente
```

## Deploy

- **Frontend → Vercel**: Root Directory = `frontend` (framework Vite).
- **Backend → Railway**: Root Directory = `backend` (usa o `Dockerfile`);
  adicionar o plugin **Postgres** no mesmo projeto e referenciar
  `DATABASE_URL`. Healthcheck em `/health` (ver `backend/railway.json`).
