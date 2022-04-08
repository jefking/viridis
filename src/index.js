const express = require('express');
const appInsights = require("applicationinsights");
const redis = require('redis');
const fs = require('fs')

const lastColorKey = 'lastcolor22';
const defaultColor = 'A132BE';

//Create an app
const app = express();

app.get('/', (req, res) => {
    const html = fs.readFileSync('./index.htm', 'utf-8')
    res = {
        // status: 200, /* Defaults to 200 */
        body: html,
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    };
});

app.get('/api/color', async (req, res) => {
    //appInsights.setup().start();
    const id = req.query.id;
    console.log('from: ' + id);

    const defaultColor = 'A132BE';
    const lastColor = await getColor();

    console.log(lastColor);

    res = {
        body: {
            color: lastColor || defaultColor
        }
    };
});

app.put('/api/colors', async (req, res) => {
    //appInsights.setup().start();

    let model = (typeof req.body != 'undefined' && typeof req.body == 'object') ? req.body : null;
    let err = ''
    err += !model ? "no data; or invalid payload in body. " : '';
    err += !model.id ? "no id. " : '';
    err += !model.lat ? "no latitude. " : '';
    err += !model.long ? "no longitude. " : '';
    model.color = (model.color ?? defaultColor).replace("#", '');

    await setColor(model.color);

    //store incoming
    dataModel = {
        id: model.id,
        lat: model.lat,
        long: model.long,
        color: parseInt(model.color, 24)
    };

    //determine outgoing
    //generate response from data-store (Redis)
    //-Time Delayed Average, weighted by proximity
    respObj = {
        color: getColorCode()
    };

    context.res = {
        status: err == '' ? 200 : 500,
        body: respObj
    };

    context.done(err == '' ? null : err);
});

//Listen port
const PORT = 9099;
app.listen(PORT);
console.log(`Running on port ${PORT}`);

async function getColor() {
    const lastColorKey = 'lastcolor22';
    const client = redis.createClient();
    await client.connect();

    return await client.get(lastColorKey);
}

async function setColor(color) {
    const lastColorKey = 'lastcolor22';
    const client = redis.createClient();
    await client.connect();

    return await client.set(lastColorKey, color);
}

function getColorCode() {
    const makeColorCode = '0123456789ABCDEF';
    var code = '';
    for (var count = 0; count < 6; count++) {
        code += makeColorCode[Math.floor(Math.random() * 16)];
    }
    return code;
}