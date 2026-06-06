FROM ghcr.io/puppeteer/puppeteer:22.6.0

USER root
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --chown=pptruser:pptruser . .

RUN mkdir -p /app/storage /app/server/data \
  && chown -R pptruser:pptruser /app

USER pptruser

ENV NODE_ENV=production
ENV PORT=10000
ENV DATA_DIR=/app/storage
ENV WHATSAPP_SESSION_PATH=/app/storage/whatsapp-session
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

EXPOSE 10000

CMD ["npm", "start"]
