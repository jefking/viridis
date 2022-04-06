const fs = require('fs')

const html = fs.readFileSync('./display/index.htm','utf-8')

module.exports = async function (context, req) {
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: html,
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    };
} 