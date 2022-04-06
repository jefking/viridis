//const appInsights = require("applicationinsights");

module.exports = async function (context, req) {
    //appInsights.setup().start();
    
    context.res = {
        body: {
            color: 'A132BE'
        }
    };
}