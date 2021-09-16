var crypto = require('crypto');
var config = require('./config');

//full documentation at - https://docs.pro.coinbase.com
//The what and the secret are used to generate a unique 'hmac' to verify every request
//A key is created from the secret using a base64 decode
//The hmac is created using this key and the sha256 algorithm
//Finally is updated using the 'what' and then encrypted again ready to pass in your API request.
//The request is verified by coinbase using the same information which you also pass in the request header.
function getAuth(timestamp, method, requestPath, body) {
    var secret = config.apiSecret;

    //if your request will have a body i.e will be a post request then this must also be used to encrpt the key
    var what = '';

    if(body != null) {
        what = timestamp + method + requestPath + JSON.stringify(body);
    } else {
        what = timestamp + method + requestPath + '';
    }
    
    
    var key = Buffer.from(secret, 'base64');
    
    var hmac = crypto.createHmac('sha256', key);
    return hmac.update(what).digest('base64');
}

module.exports = { getAuth }