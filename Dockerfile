FROM node:22-alpine AS build
WORKDIR /app
RUN npm install --global pnpm@11.11.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_URL=/kahoot-api
ARG VITE_AUTH_API_URL=/auth
ARG VITE_PUBLIC_WEB_URL=
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_AUTH_API_URL=${VITE_AUTH_API_URL}
ENV VITE_PUBLIC_WEB_URL=${VITE_PUBLIC_WEB_URL}
RUN pnpm run build

FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
