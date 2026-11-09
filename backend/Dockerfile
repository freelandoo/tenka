# syntax=docker/dockerfile:1

# --- build: compila TypeScript -> dist/ -----------------------------------
# Versão EXATA do Node (segurança): etiqueta solta pegava o patch em cache do Railway. 22.23.4 = release de segurança de 2026-10-20.
FROM node:22.23.4-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- prod: só dependências de runtime + dist + migrations -----------------
FROM node:22.23.4-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
# Railway injeta PORT; o servidor escuta em 0.0.0.0:$PORT.
EXPOSE 8080
CMD ["node", "dist/index.js"]
