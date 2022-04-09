const express = require('express');
const WebSocket = require('ws');
const redis = require('redis');
const fs = require('fs');
const { env } = require('process');

/**
 * Variables
 */
const exPort = 9099;
const wsPort = 9100;
const lastColorKey = 'lastcolor22';
const defaultColor = randomColor();
const conVars = {
    url: process.env.REDIS_URL || '127.0.0.1:6379'
};
const html = fs.readFileSync('./index.htm', 'utf-8');

//Log Variables
console.log(`Ports: Express/${exPort}, WebSockets/${wsPort}`);
console.log(`Configuration: Redis/${conVars}`);

/**
 * Init Application
 */
// Express
const app = express();
app.use(express.json());
app.listen(exPort);

// WebSockets
const server = new WebSocket.Server({
    port: wsPort
});

//setColor(defaultColor);

/**
 * Express
 */
app.get('/', (req, res) => {
    res
        .status(200)
        .send(html)
        .end();
});

app.get('/api/color', async (req, res) => {
    const lastColor = await getColor();

    dataModel = {
        color: lastColor || defaultColor,
        id: req.query.id
    };
    console.log(dataModel);//Store

    res
        .status(200)
        .send({
            color: dataModel.color
        })
        .end();
});

app.put('/api/color', async (req, res) => {
    const model = (typeof req.body != 'undefined' && typeof req.body == 'object') ? req.body : null;
    let err = ''
    err += !model ? "no data; or invalid payload in body. " : '';
    err += !model.id ? "no id. " : '';
    err += !model.lat ? "no latitude. " : '';
    err += !model.long ? "no longitude. " : '';

    if (0 === err.length) {
        model.color = (model.color ?? defaultColor).replace("#", '');

        await setColor(model.color);

        //store incoming
        dataModel = {
            id: model.id,
            lat: model.lat,
            long: model.long,
            color: parseInt(model.color, 24)
        };
        console.log(dataModel);//Store

        //determine outgoing
        //generate response from data-store (Redis)
        //-Time Delayed Average, weighted by proximity
        respObj = {
            color: await getColor()
        };

        res
            .status(200)
            .send(respObj)
            .end();
    }
    else {
        console.log(err); //Log

        res
            .status(500)
            .end();
    }
});

/**
 * Web Sockets
 */
let sockets = [];
server.on('connection', function (socket) {
    sockets.push(socket);

    // When you receive a message, send that message to every socket.
    socket.on('message', function (msg) {
        sockets.forEach(s => s.send(msg));
    });

    // When a socket closes, or disconnects, remove it from the array.
    socket.on('close', function () {
        sockets = sockets.filter(s => s !== socket);
    });
});

/**
 * Functions
 */
async function getColor() {
    const lastColorKey = 'lastcolor22';
    const client = redis.createClient(conVars);
    await client.connect();

    return await client.get(lastColorKey);
}

async function setColor(color) {
    const lastColorKey = 'lastcolor22';
    const client = redis.createClient(conVars);
    await client.connect();

    return await client.set(lastColorKey, color);
}

function randomColor() {
    const makeColorCode = '0123456789ABCDEF';
    var code = '';
    for (var count = 0; count < 6; count++) {
        code += makeColorCode[Math.floor(Math.random() * 16)];
    }
    return code;
}