const appInsights = require("applicationinsights");
const redis = require('redis');

module.exports = async function (context, req) {
    //appInsights.setup().start();
    const id = req.query.id;
    console.log('from: ' + id);

    context.res = {
        body: {
            color: getColorCode()
        }
    };
}

function getColorCode() {
    const makeColorCode = '0123456789ABCDEF';
    var code = '';
    for (var count = 0; count < 6; count++) {
        code += makeColorCode[Math.floor(Math.random() * 16)];
    }
    return code;
}