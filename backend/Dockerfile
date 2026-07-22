# syntax=docker/dockerfile:1

# --- build: compila TypeScript -> dist/ -----------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- prod: só dependências de runtime + dist + migrations -----------------
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
# Railway injeta PORT; o servidor escuta em 0.0.0.0:$PORT.
EXPOSE 8080
CMD ["node", "dist/index.js"]
