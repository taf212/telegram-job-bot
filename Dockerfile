FROM node:20-alpine

# Répertoire de travail
WORKDIR /app

# Copier les manifestes de dépendances en premier (cache Docker)
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --omit=dev

# Copier le code source
COPY src/ ./src/

# Ne jamais inclure credentials.json dans l'image
# → passer GOOGLE_CREDENTIALS_JSON comme variable d'environnement

EXPOSE 3000

# Healthcheck pour Railway/Render
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/app.js"]
