const appInsights = require("applicationinsights");
const redis = require('redis');

module.exports = async function (context, req) {
    //appInsights.setup().start();
    const id = req.query.id;
    console.log('from: ' + id);

    const defaultColor = 'A132BE';
    const lastColor = await getColor();

    console.log(lastColor);

    context.res = {
        body: {
            color: lastColor || defaultColor
        }
    };
}

async function getColor()
{
    const lastColorKey = 'lastcolor22';
    const client = redis.createClient();
    await client.connect();

    return await client.get(lastColorKey);
}