var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();
var lastTick = {};

function getPrice() {
    return lastTick;
}

function configure(productIds) {
    client.on('connect', function(connection) {
        console.log('Connection successful');
        var body = {
            "type": "subscribe",
            "product_ids": productIds,
            "channels": ["ticker"]
        }
        connection.send(JSON.stringify(body));
        connection.on('message', async message => {
            var ticker = JSON.parse(message.utf8Data);
            lastTick = ticker;
        });
    });
}

function connect() {
    client.connect('wss://ws-feed.pro.coinbase.com');
}


module.exports = { configure, connect, getPrice }
