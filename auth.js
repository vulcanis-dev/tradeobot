var crypto = require('crypto');
var config = require('./config');

function getAuth(timestamp, method, requestPath) {
    var secret = config.apiSecret;
    var what = timestamp + method + requestPath + '';
    
    var key = Buffer.from(secret, 'base64');
    
    var hmac = crypto.createHmac('sha256', key);
    return hmac.update(what).digest('base64');
}

module.exports = { getAuth }