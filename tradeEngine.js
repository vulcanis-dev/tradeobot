var auth = require('./auth.js');
const axios = require('axios');
var config = require('./config');

var fiveMinsEther = 0;
var lastEtherPrice = 0;
var lastEtherBuy = 0;
var lastEthBuy;
var sellPlaced = true;
var order;

async function getAccounts(currency) {
    //timestamp has to be generated now so it matches across our gmac and headers.
    var timestamp = Date.now() / 1000;
    var method = 'GET';
    var path = '/accounts';
    var hmac = auth.getAuth(timestamp, method, path);
    var headers = getRequestHeaders(timestamp, hmac);
    var accounts = await makeRequest(method, path, headers);
    return accounts.filter(x => x.currency == currency);
}

const unique = (value, index, self) => {
    return self.indexOf(value) === index
}

async function getUnsoldBuys() {
    //performance is terrible, too many arrays
    var fills = await getFillsByProductId('ETH-GBP');
    var orderIds = fills.map(x => x.order_id).filter(unique);
    var orders = [];

    for (const orderId of orderIds) {

        var order = await getOrderById(orderId);

        orders.push(order);
    }

    var buys = orders.filter(order => order.side == 'buy');
    var sells = orders.filter(order => order.side == 'sell');

    var unmatchedBuys = [];

    for (const buy of buys) {
        if (!sells.map(x => parseFloat(x.size).toFixed(4)).includes(parseFloat(buy.size).toFixed(4))) {
            unmatchedBuys.push(buy);
        }
    }

    return unmatchedBuys;
}

async function getProductsByBaseCurrency(currency) {
    var products = await getProducts();
    return products.filter(x => x.base_currency == currency);
}

async function getProductsByCurrencyPair(currencyPairId) {
    var timestamp = Date.now() / 1000;
    var method = 'GET';
    var path = '/products/' + currencyPairId + '/ticker';
    var hmac = auth.getAuth(timestamp, method, path);
    var headers = getRequestHeaders(timestamp, hmac);
    var product = await makeRequest(method, path, headers);
    return product;
}

async function getProducts() {
    var timestamp = Date.now() / 1000;
    var method = 'GET';
    var path = '/products';
    var hmac = auth.getAuth(timestamp, method, path);
    var headers = getRequestHeaders(timestamp, hmac);
    var products = await makeRequest(method, path, headers);
    return products;
}

async function getFillsByProductId(productId) {
    var timestamp = Date.now() / 1000;
    var method = 'GET';
    var path = '/fills?product_id=' + productId;
    var hmac = auth.getAuth(timestamp, method, path);
    var headers = getRequestHeaders(timestamp, hmac);
    var products = await makeRequest(method, path, headers);
    return products;
}

async function getOrderById(orderId) {
    var timestamp = Date.now() / 1000;
    var method = 'GET';
    var path = '/orders/' + orderId;
    var hmac = auth.getAuth(timestamp, method, path);
    var headers = getRequestHeaders(timestamp, hmac);
    var order = await makeRequest(method, path, headers);
    return order;
}

async function placeLimitOrder(productId, price, size, side) {
    var timestamp = Date.now() / 1000;
    var method = 'POST';
    var order = { product_id: productId, price: String(price), size: String(size), side: side }

    var path = '/orders';
    var hmac = auth.getAuth(timestamp, method, path, order);
    var headers = getRequestHeaders(timestamp, hmac);
    var orderPlaced = await makeRequest(method, path, headers, order);
}

function getRequestHeaders(timestamp, hmac) {
    return {
        'CB-ACCESS-SIGN': hmac,
        'CB-ACCESS-KEY': config.apiKey,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-PASSPHRASE': config.apiPassphrase,
        'User-Agent': 'tradebot',
        'Content-Type': 'application/json'
    }
}

async function makeRequest(method, path, headers, body) {
    const instance = getClient(headers);

    if (method == 'GET') {
        var response = await instance.get(path).catch(error => {
            console.error('There was an error!', error);
        });;
    } else if (method == 'POST') {
        var response = await instance.post(path, body).catch(error => {
            console.error('There was an error!', error);
        });;
    }

    return response.data;
}

function getClient(headers) {
    return axios.create({
        baseURL: 'https://api.pro.coinbase.com',
        timeout: 1000,
        headers: headers
    });
}

async function calculateDifference() {

    var lastEtherBuyFee = 0;

    if (lastEtherBuy == 0) {
        var fills = await getFillsByProductId('ETH-GBP');
        lastEtherBuy = parseFloat(fills[0].price);
        lastEtherBuyFee = parseFloat(fills[0].fee);
        lastEthBuy = fills[0];
        order = await getOrderById(fills[0].order_id);
    }
    var ether = await getProductsByCurrencyPair('ETH-GBP');

    if (fiveMinsEther == 0) {
        fiveMinsEther = ether.price;
        lastEtherPrice = fiveMinsEther;
    }

    var currentEther = parseFloat(ether.price);
    var diff = (currentEther / lastEtherPrice) - 1;
    var diffPercentage = diff * 100;

    var diffLastBuyAndCurrent = (currentEther / lastEtherBuy) - 1;
    var diffLastBuyAndCurrentPercentage = diffLastBuyAndCurrent * 100;


    console.log('currentEther = ' + currentEther);
    console.log('lastEther = ' + lastEtherPrice);
    console.log('lastEtherBuy = ' + lastEtherBuy);
    console.log('Difference between last buy and current price - ' + diffLastBuyAndCurrentPercentage + ' %');

    var orderFilledSize = parseFloat(order.filled_size);
    var estimatedFee = (currentEther * orderFilledSize * 0.005);
    var estimatedTotalFees = parseFloat(order.fill_fees) + (currentEther * orderFilledSize * 0.005);


    var currentSellValue = currentEther * orderFilledSize - estimatedFee;
    var estimatedProfit = currentSellValue - order.executed_value;

    var estimatedProfitPercentage = ((currentSellValue / order.executed_value) - 1) * 100;

    console.log('')
    console.log('sell at current value - ' + currentSellValue);
    console.log('estimated total fees - ' + estimatedTotalFees);
    console.log('estimated profit % at current price - ' + estimatedProfitPercentage);
    console.log('estimated profit  at current price - ' + estimatedProfit);

    if (estimatedProfitPercentage > 2 && !sellPlaced) {
        var sell = await placeLimitOrder('ETH-GBP', currentEther, orderFilledSize, 'sell');
        console.log('SELL PLACED at ' + currentEther);
        sellPlaced = true;
    }

}

module.exports = { getAccounts, getProducts, getProductsByBaseCurrency, getProductsByCurrencyPair, calculateDifference, getUnsoldBuys }

