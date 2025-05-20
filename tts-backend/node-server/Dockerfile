
FROM node:23.9-slim

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package*.json ./
RUN npm install -g node-dev
# USER node

RUN npm install
# COPY --chown=node:node . .
COPY . .
RUN pwd
RUN ls


EXPOSE 8080

CMD [ "node-dev", "index.ts" ]
# CMD [ "node", "index.ts" ]
