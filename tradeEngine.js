var auth = require('./auth.js');
const axios = require('axios');
var config = require('./config');


var fiveMinsEther = 0;
var lastEtherPrice = 0;
var lastEtherBuy = 0;

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

async function makeRequest(method, path, headers) {
    const instance = getClient(headers);

    var response = await instance.get(path);
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

    if(lastEtherBuy == 0) {
        var fills = await getFillsByProductId('ETH-GBP');
        lastEtherBuy = fills[0].price;        
    }
    var ether = await getProductsByCurrencyPair('ETH-GBP');

    if(fiveMinsEther == 0) {
        fiveMinsEther = ether.price;
        lastEtherPrice = fiveMinsEther;        
    }

    var currentEther = ether.price;        
    var diff = (currentEther / lastEtherPrice) -1;
    var diffPercentage = diff * 100;

    var diffLastBuyAndCurrent = (currentEther / lastEtherBuy) -1 ;
    var diffLastBuyAndCurrentPercentage = diffLastBuyAndCurrent * 100;


    console.log('currentEther = ' + currentEther);
    console.log('lastEther = ' + lastEtherPrice);  
    console.log('lastEtherBuy = ' + lastEtherBuy);  
    console.log('diff (number) = ' + diff)  
    console.log('diff (%) = ' + diffPercentage);
    console.log('Difference between last buy and current price - ' + diffLastBuyAndCurrentPercentage + ' %' );
}

module.exports = { getAccounts, getProducts, getProductsByBaseCurrency, getProductsByCurrencyPair, calculateDifference }

