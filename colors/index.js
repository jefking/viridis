//const appInsights = require("applicationinsights");

const defaultColor = 'A132BE';

module.exports = async function (context, req) {
    //appInsights.setup().start();
    
    let model = (typeof req.body != 'undefined' && typeof req.body == 'object') ? req.body : null;
    let err = ''
    err += !model ? "no data; or invalid payload in body" : '';
    err += !model.id ? "no id" : '';
    err += !model.lat ? "no latitude" : '';
    err += !model.long ? "no longitude" : '';
    model.color = model.color ?? defaultColor;

    //store incoming

    //determine outgoing

    respObj = {
        color: defaultColor
    };

    context.res = {
        status: err == '' ? 200 : 500,
        body: respObj
    };
    
    context.done(err == '' ? null : err);
};