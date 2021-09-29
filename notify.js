var config = require('./config');
const axios = require('axios');

async function sendTradeNotification(product, side, value) {
    var key = config.notifyKey;
    var client = getClient(key, "notify");
    var body = { "value1" : product, "value2" : side, "value3" : value } 
    var response = await client.post('', body).catch(error => {
        console.error('There was an error!', error);
    });;
}

async function sendNotification(message) {
    var key = config.notifyKey;
    var client = getClient(key, "notify coinbase event");
    var body = { "msg": message }; 
    var response = await client.post('', body).catch(error => {
        console.error('There was an error!', error);
    });;
}

function getClient(key, event) {
    var urlPart = '';
    if(event == 'notify') {
        urlPart = '/with/key/';
    } else {
        urlPart = '/json/with/key/';
    }
    return axios.create({
        baseURL: 'https://maker.ifttt.com/trigger/' + event + urlPart + key,
        timeout: 1000
    });
}

module.exports = { sendNotification, sendTradeNotification };