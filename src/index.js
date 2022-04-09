const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const redis = require('redis');
const redisTimeSeries = require('redistimeseries-js');
const fs = require('fs');
const { env } = require('process');
const { response } = require('express');

/**
 * Variables
 */
const port = 9099;
const makeColorCode = '0123456789ABCDEF';
const lastColorKey = 'lastcolor22';
const defaultColor = randomColorHex();
const conVars = {
    url: process.env.REDIS_URL || '127.0.0.1:6379'
};
let connections = [];
const html = fs.readFileSync('./index.htm', 'utf-8');
const rClient = redis.createClient(conVars);
rClient.connect();

const rtsClient = new redisTimeSeries(conVars);
const rtsKey = 'colors';

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

    const respObj = {
        color: dataModel.color
    };
    res
        .status(200)
        .send(respObj)
        .end();
});

// Get the /ws websocket route
app.ws('/ws/color', async function (ws, req) {
    connections.push(ws);

    ws.on('message', async function (msg) {
        model = JSON.parse(msg);
        let err = validate(model);
        if (0 === err.length) {
            const respObj = await set(model);

            const message = JSON.stringify(respObj);

            connections.forEach((ws) => {
                //if the connections are objects with info use something like ws.ws.send()
                ws.send(message)
            });
        }
        else {
            console.log(err); //Log
        }
    });
});

app.put('/api/color', async (req, res) => {
    const model = (typeof req.body != 'undefined' && typeof req.body == 'object') ? req.body : null;
    let err = validate(model);

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
function validate(model) {
    let err = []
    if (!model) {
        err.push("no data; or invalid payload in body.");
    }
    if (!model.id) {
        err.push("no id");
    }
    if (!model.lat) {
        err.push("no latitude");
    }
    if (!model.long) {
        err.push("no longitude");
    }
    return err;
}

async function set(model) {
    //Comment out Redis to get websockets working
    await setColor(model.color ?? defaultColor);

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
        color: randomColorHex()
    };
}

async function getColor() {
    const lastColor = await rClient.get(lastColorKey);
    return parseInt(lastColor).toString(16);
}

async function setColor(color) {
    colorInt = parseInt(color.replace("#", ''), 16);
    return await rClient.set(lastColorKey, colorInt);
}

function randomColorHex() {
    var code = '';
    for (var count = 0; count < 6; count++) {
        code += makeColorCode[Math.floor(Math.random() * 16)];
    }
    return code;
}