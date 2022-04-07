//const appInsights = require("applicationinsights");

const defaultColor = 'A132BE';

module.exports = async function (context, req) {
    //appInsights.setup().start();

    let model = (typeof req.body != 'undefined' && typeof req.body == 'object') ? req.body : null;
    let err = ''
    err += !model ? "no data; or invalid payload in body. " : '';
    err += !model.id ? "no id. " : '';
    err += !model.lat ? "no latitude. " : '';
    err += !model.long ? "no longitude. " : '';
    model.color = model.color ?? defaultColor;

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
};

function getColorCode() {
    const makeColorCode = '0123456789ABCDEF';
    var code = '';
    for (var count = 0; count < 6; count++) {
        code += makeColorCode[Math.floor(Math.random() * 16)];
    }
    return code;
}