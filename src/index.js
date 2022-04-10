const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const redis = require('redis');
const { TimeSeriesDuplicatePolicies, TimeSeriesEncoding, TimeSeriesAggregationType } = require('@node-redis/time-series');
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

const rtsKey = 'color11';
const startRedisTimeSeries = async (client) => {
    try {
        await client.ts.create(rtsKey, {
            RETENTION: 86400000, // 1 day in milliseconds
            ENCODING: TimeSeriesEncoding.UNCOMPRESSED, // No compression
            DUPLICATE_POLICY: TimeSeriesDuplicatePolicies.BLOCK // No duplicates
        });
    } catch (err) {
        console.error(err);
    }
};

//Log Variables
console.log(`Configuration: Express:${port}, Redis:${JSON.stringify(conVars)}`);

/**
 * Init Application
 */
const html = fs.readFileSync('./index.htm', 'utf-8');
const rClient = redis.createClient(conVars);
rClient.connect();
startRedisTimeSeries(rClient);

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
    let lastColor = await getColor();
    dataModel = {
        color: lastColor ?? defaultColor,
        id: req.query.id
    };
    //console.log(dataModel);//Store

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
        const tsInfo = await rClient.ts.info(rtsKey);//Temp
        console.log(tsInfo);//Temp
        
        model = JSON.parse(msg);
        let err = validate(model);
        if (0 === err.length) {
            const respObj = await set(model);

            const message = JSON.stringify(respObj);

            connections.forEach((ws) => {
                ws.send(message)
            });
        }
        else {
            console.error(err); //Log
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
        console.error(err); //Log

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
    //console.log(dataModel);//Store

    //determine outgoing
    //generate response from data-store (Redis)
    //-Time Delayed Average, weighted by proximity
    const color = await getAverageColor();
    console.log("avg color: " + color);
    return {
        color: color
    };
}

async function getColor() {
    let lastColor = await rClient.ts.get(rtsKey);
    console.log("get: "+lastColor.value);//TEMP
    let colorHex = parseInt(lastColor.value).toString(16);
    console.log("get hex: "+colorHex);//TEMP
    return colorHex;
}
async function getAverageColor() {
    let fromTimestamp = new Date().setDate(-1).valueOf();
    let toTimestamp = new Date().valueOf();
    // console.log("fr" + fromTimestamp);//Temp
    // console.log("to" + toTimestamp);//Temp

    let colorsResponse = await rClient.ts.range(rtsKey, fromTimestamp, toTimestamp, {
        // Group into 60 minutes averages.
        AGGREGATION: {
            type: TimeSeriesAggregationType.AVERAGE,
            timeBucket: 360000
        }
    });
    console.log("avg: " + JSON.stringify(colorsResponse));//Temp
    if (colorsResponse.length > 0) {
        //console.log(JSON.stringify(colorAvg));//Temp
        console.log("color response:" + colorsResponse[colorsResponse.length -1].value);//Temp
        return parseInt(colorsResponse[colorsResponse.length -1].value).toString(16);
    }
    else{
        let c =randomColorHex(); 
        console.log("!random!: " + c);
        return c;
    }
}

async function setColor(color) {
    //console.log("set color: " + color);
    let colorInt = parseInt(color.replace("#", ''), 16);
    let at = new Date().setHours(0);
    //console.log("set color int: " + colorInt);
    await rClient.ts.add(rtsKey, at, colorInt);//Time Series
    //await rClient.set(lastColorKey, colorInt); //Last Color
}

function randomColorHex() {
    var code = '';
    for (var count = 0; count < 6; count++) {
        code += makeColorCode[Math.floor(Math.random() * 16)];
    }
    return code;
}