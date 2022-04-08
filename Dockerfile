FROM node:17-alpine3.15

WORKDIR /usr/src/app

COPY ./src .

RUN npm install

EXPOSE 9099

CMD [ "node", "index.js" ]