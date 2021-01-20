FROM node:14.15.3

WORKDIR /dunctebot-ws
COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile  --production=true
COPY . .

CMD ["node", "src/index.js"]
