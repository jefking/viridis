const appInsights = require("applicationinsights");

module.exports = async function (context, req) {
    appInsights.setup().start();
    
    let model = (typeof req.body != 'undefined' && typeof req.body == 'object') ? req.body : null;
    let err = ''
    err += !model ? "no data; or invalid payload in body" : '';
    err += !model.id ? "no id" : '';
    err += !model.lat ? "no latitude" : '';
    err += !model.long ? "no longitude" : '';

    respObj = {
        color: 'A132BE'
    };

    context.res = {
        status: err == '' ? 200 : 500,
        body: respObj
    };
    
    context.done(err == '' ? null : err);
};