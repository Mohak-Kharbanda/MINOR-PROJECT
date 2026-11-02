# EduTrack — single container serving the API and the built web app.
#   docker build -t edutrack .
#   docker run -p 4000:4000 --env-file spms-backend/.env edutrack

# ---------- 1) Build the web app ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY spms-shared/package.json spms-shared/
COPY spms-backend/package.json spms-backend/
COPY spms-frontend/package.json spms-frontend/
RUN npm ci --include=dev --ignore-scripts
COPY spms-shared spms-shared
COPY spms-backend spms-backend
COPY spms-frontend spms-frontend
RUN npm run build

# ---------- 2) Production dependencies only ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY spms-shared/package.json spms-shared/
COPY spms-backend/package.json spms-backend/
COPY spms-frontend/package.json spms-frontend/
RUN npm ci --omit=dev --workspace @edutrack/backend --ignore-scripts

# ---------- 3) Runtime ----------
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=4000 \
    SERVE_CLIENT=true \
    CLIENT_DIST_DIR=/app/spms-frontend/dist \
    LOCAL_UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/spms-shared/package.json spms-shared/
COPY --from=build /app/spms-shared/src spms-shared/src
COPY --from=build /app/spms-backend/package.json spms-backend/
COPY --from=build /app/spms-backend/src spms-backend/src
COPY --from=build /app/spms-backend/scripts spms-backend/scripts
COPY --from=build /app/spms-frontend/dist spms-frontend/dist
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
WORKDIR /app/spms-backend
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1
CMD ["node", "src/server.js"]
