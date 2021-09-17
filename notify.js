var config = require('./config');
const axios = require('axios');

async function sendNotification(message) {
    var key = config.notifyKey;
    var client = getClient(key);
    var response = await client.get().catch(error => {
        console.error('There was an error!', error);
    });;
}

function getClient(key) {
    return axios.create({
        baseURL: 'https://maker.ifttt.com/trigger/notify/with/key/' + key,
        timeout: 1000
    });
}

module.exports = { sendNotification };