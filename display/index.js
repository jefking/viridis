module.exports = async function (context, req) {
    const responseMessage = "<html></html>";
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage,
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    };
}