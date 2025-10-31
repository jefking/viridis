FROM node:22-alpine

WORKDIR /usr/src/app

COPY ./src .

RUN npm install

CMD [ "npm", "start" ]