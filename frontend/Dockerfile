# syntax=docker/dockerfile:1

# --- dependências (camada cacheada) ---------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- dev: Vite com HMR ----------------------------------------------------
FROM deps AS dev
# o bind mount do Windows não propaga eventos inotify; polling resolve
ENV CHOKIDAR_USEPOLLING=true
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# --- build estático -------------------------------------------------------
FROM deps AS build
COPY . .
RUN npm run build

# --- prod: dist servido por nginx ----------------------------------------
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
