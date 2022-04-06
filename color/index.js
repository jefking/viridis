//const appInsights = require("applicationinsights");

module.exports = async function (context, req) {
    //appInsights.setup().start();
    
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