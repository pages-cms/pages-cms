FROM node:20

WORKDIR /app

COPY package.json package-lock.json postcss.config.js tailwind.config.js vite.config.js /app/
RUN npm install

COPY src /app/src
COPY public /app/public
COPY functions /app/functions
COPY index.html /app/
COPY entrypoint.sh /app/

ENTRYPOINT /app/entrypoint.sh