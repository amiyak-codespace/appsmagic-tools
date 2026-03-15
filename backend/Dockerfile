FROM node:20-alpine
RUN apk add --no-cache python3 py3-pip && pip3 install --break-system-packages PyMuPDF Pillow pandas google-generativeai
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force \
  && find node_modules -type d \( -name test -o -name tests -o -name __tests__ -o -name docs -o -name .github \) -prune -exec rm -rf '{}' + \
  && find node_modules -type f \( -name "*.md" -o -name "*.map" -o -name "*.ts" \) -delete
COPY src ./src
EXPOSE 4000
CMD ["node", "src/index.js"]
