var auth = require('./auth.js');
const axios = require('axios');
var config = require('./config');

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

module.exports = { getAccounts, getProducts, getProductsByBaseCurrency, getProductsByCurrencyPair, placeLimitOrder, getFillsByProductId, getOrderById }

