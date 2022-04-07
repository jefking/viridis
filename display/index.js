const fs = require('fs')


module.exports = async function (context, req) {
    const html = fs.readFileSync('./display/index.htm', 'utf-8')
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: html,
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    };
}