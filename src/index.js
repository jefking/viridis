const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const redis = require('redis');
const fs = require('fs');
const { env } = require('process');
const { response } = require('express');

/**
 * Variables
 */
const port = 9099;
const lastColorKey = 'lastcolor22';
const defaultColor = randomColor();
const conVars = {
    url: process.env.REDIS_URL || '127.0.0.1:6379'
};
let connections = [];
const html = fs.readFileSync('./index.htm', 'utf-8');

//Log Variables
console.log(`Configuration: Express:${port}, Redis:${JSON.stringify(conVars)}`);

/**
 * Init Application
 */
const app = express();
app.use(express.json());
const server = http.createServer(app).listen(port);
expressWs(app, server);

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

// Get the /ws websocket route
app.ws('/ws/color', async function (ws, req) {
    connections.push(ws);

    ws.on('message', async function (msg) {
        model = JSON.parse(msg);
        //Validation
        const respObj = await set(model);

        const message = JSON.stringify(respObj);

        connections.forEach((ws) => {
            //if the connections are objects with info use something like ws.ws.send()
            ws.send(message)
        })
    });
});

app.put('/api/color', async (req, res) => {
    const model = (typeof req.body != 'undefined' && typeof req.body == 'object') ? req.body : null;
    let err = ''
    err += !model ? "no data; or invalid payload in body. " : '';
    err += !model.id ? "no id. " : '';
    err += !model.lat ? "no latitude. " : '';
    err += !model.long ? "no longitude. " : '';

    if (0 === err.length) {
        respObj = set(model);

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
 * Functions
 */
async function set(model) {
    model.color = parseInt((model.color ?? defaultColor).replace("#", ''), 24);

    //Comment out Redis to get websockets working
    await setColor(model.color);

    //store incoming
    dataModel = {
        id: model.id,
        lat: model.lat,
        long: model.long,
        color: model.color
    };
    console.log(dataModel);//Store

    //determine outgoing
    //generate response from data-store (Redis)
    //-Time Delayed Average, weighted by proximity
    return {
        color: randomColor()
    };
}

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