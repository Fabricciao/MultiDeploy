# Image Playwright officielle (Chromium + dépendances système). Mettre la même version que playwright-core ci-dessous.
FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.mjs ./
ENV PORT=8080
EXPOSE 8080
USER pwuser
CMD ["node", "server.mjs"]
