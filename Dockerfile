# Usa imagem oficial do Node com Puppeteer compatível
FROM node:20-slim

# Instala dependências do Puppeteer (fontes, libgtk, etc.)
RUN apt-get update && apt-get install -y \
    fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 \
    libxcomposite1 libxdamage1 libxrandr2 xdg-utils wget curl gnupg \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Cria pasta e copia arquivos
WORKDIR /app
COPY . .

# Instala dependências do projeto
RUN npm install && npx puppeteer browsers install chrome

# Comando para rodar o script
CMD ["npm", "start"]
