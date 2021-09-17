var coinbaseService = require('./coinbaseService');

var fiveMinsEther = 0;
var lastEtherPrice = 0;
var lastEtherBuy = 0;
var lastEthBuy;
var sellPlaced = true;
var order;

const unique = (value, index, self) => {
    return self.indexOf(value) === index
}

async function getUnsoldBuys() {
    //performance is terrible, too many arrays
    var fills = await coinbaseService.getFillsByProductId('ETH-GBP');
    var orderIds = fills.map(x => x.order_id).filter(unique);
    var orders = [];

    for (const orderId of orderIds) {

        var order = await coinbaseService.getOrderById(orderId);

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

async function loopBuys(buys) {
    buys.forEach(async (buy) => {
        await calculateDifferenceAgainstBuy(buy);
    });
}

async function calculateDifferenceAgainstBuy(buy) {
    var ether = await coinbaseService.getProductsByCurrencyPair('ETH-GBP');
    var currentEther = parseFloat(ether.price);
    
    var orderFilledSize = parseFloat(buy.filled_size);
    var estimatedFee = (currentEther * orderFilledSize * 0.005);
    var estimatedTotalFees = parseFloat(buy.fill_fees) + (currentEther * orderFilledSize * 0.005);
    var currentSellValue = currentEther * orderFilledSize - estimatedFee;
    var estimatedProfit = currentSellValue - buy.executed_value;

    var estimatedProfitPercentage = ((currentSellValue / buy.executed_value) - 1) * 100;

    console.log('')
    console.log('sell at current value - ' + currentSellValue);
    console.log('estimated total fees - ' + estimatedTotalFees);
    console.log('estimated profit % at current price - ' + estimatedProfitPercentage);
    console.log('estimated profit  at current price - ' + estimatedProfit);

    /* if (estimatedProfitPercentage > 2 && !sellPlaced) {
        var sell = await coinbaseService.placeLimitOrder('ETH-GBP', currentEther, orderFilledSize, 'sell');
        console.log('SELL PLACED at ' + currentEther);
        sellPlaced = true;
    } */
}

async function calculateDifference() {

    var lastEtherBuyFee = 0;

    if (lastEtherBuy == 0) {
        var fills = await coinbaseService.getFillsByProductId('ETH-GBP');
        lastEtherBuy = parseFloat(fills[0].price);
        lastEtherBuyFee = parseFloat(fills[0].fee);
        lastEthBuy = fills[0];
        order = await getOrderById(fills[0].order_id);
    }
    var ether = await coinbaseService.getProductsByCurrencyPair('ETH-GBP');

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
        var sell = await coinbaseService.placeLimitOrder('ETH-GBP', currentEther, orderFilledSize, 'sell');
        console.log('SELL PLACED at ' + currentEther);
        sellPlaced = true;
    }

}

module.exports = { calculateDifference, getUnsoldBuys, loopBuys }

