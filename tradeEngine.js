const { on } = require('events');
var coinbaseService = require('./coinbaseService');
var cbWebsocket = require('./websocketFeed');
const ao = require('technicalindicators').AwesomeOscillator;
var notify = require('./notify');

var fiveMinsEther = 0;
var lastEtherPrice = 0;
var lastEtherBuy = 0;
var lastEthBuy;
var sellPlaced = true;
var order;
var oneMinsAgo = [];
var fiveMinsAgo = [];
var fifteenMinsAgo = [];
var thirtyMinsAgo = [];
var fourtyFiveMinsAgo = [];
var hourAgo = [];

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

async function getHistorical() {
    var productId = 'ETH-GBP';
    var side = 'buy'
    var granularity = 60;

    await getMinuteHistory(1, productId, granularity).then(r => {
        oneMinsAgo = r.slice();
    });

    await getMinuteHistory(5, productId, granularity).then(r => {
        fiveMinsAgo = r.slice();
    });

    await getMinuteHistory(15, productId, granularity).then(r => {
        fifteenMinsAgo = r.slice();
    });

    await getMinuteHistory(30, productId, granularity).then(r => {
        thirtyMinsAgo = r.slice();
    });

    await getMinuteHistory(45, productId, granularity).then(r => {
        fourtyFiveMinsAgo = r.slice();
    });

    await getMinuteHistory(60, productId, granularity).then(r => {
        hourAgo = r.slice();
    });

    var trend = compareHistorical();
    return trend;
}

function compareHistorical() {
    var hour = convertArrayToObject(hourAgo[0]);
    var fourtyFive = convertArrayToObject(fourtyFiveMinsAgo[0]);
    var thirty = convertArrayToObject(thirtyMinsAgo[0]);
    var fifteen = convertArrayToObject(fifteenMinsAgo[0]);
    var five = convertArrayToObject(fiveMinsAgo[0]);
    var one = convertArrayToObject(oneMinsAgo[0]);

    var oneMean = one.close;//(one.low + one.high) / 2;
    var fiveMean = five.close;//(five.low + five.high) / 2;
    var fifteenMean = fifteen.close;//(fifteen.low + fifteen.high) / 2;
    var thirtyMean = thirty.close;//(one.low + one.high) / 2;
    var fourtyFiveMean = fourtyFive.close;//(five.low + five.high) / 2;
    var hourMean = hour.close;//(fifteen.low + fifteen.high) / 2;

    var fiveMinTrendAsPercentage = ((oneMean / fiveMean) - 1) * 100;
    var fifteenMinTrendAsPercentage = ((oneMean / fifteenMean) - 1) * 100;
    var thirtyMinTrendAsPercentage = ((oneMean / thirtyMean) - 1) * 100;
    var fourtyFiveMinTrendAsPercentage = ((oneMean / fourtyFiveMean) - 1) * 100;
    var hourTrendAsPercentage = ((oneMean / hourMean) - 1) * 100;

    var time = new Date();
    time = new Date(one.time);
    var fiveMinsProfit = calcProfits(oneMean, hourMean, 0.1);

    console.log('est profit at 5 min sell - ' + fiveMinsProfit);

    var operator = '';

    if (fiveMinTrendAsPercentage > 0) {
        operator = '+';
    } else {
        operator = '';
    }

    console.log(operator + parseFloat(fiveMinTrendAsPercentage).toFixed(2) + '%');

    if (fifteenMinTrendAsPercentage > 0) {
        operator = '+';
    } else {
        operator = '';
    }

    console.log(operator + parseFloat(fifteenMinTrendAsPercentage).toFixed(2) + '%');

    if (thirtyMinTrendAsPercentage > 0) {
        operator = '+';
    } else {
        operator = '';
    }

    console.log(operator + parseFloat(thirtyMinTrendAsPercentage).toFixed(2) + '%');

    if (fourtyFiveMinTrendAsPercentage > 0) {
        operator = '+';
    } else {
        operator = '';
    }

    console.log(operator + parseFloat(fourtyFiveMinTrendAsPercentage).toFixed(2) + '%');

    if (hourTrendAsPercentage > 0) {
        operator = '+';
    } else {
        operator = '';
    }

    console.log(operator + parseFloat(hourTrendAsPercentage).toFixed(2) + '%');
    /*    var fiveMinTrend = (oneMean - fiveMean);
       console.log(fiveMinTrend);
       var fifteenMinTrend = oneMean - fifteenMean;
       console.log(fifteenMinTrend); */

    return hourTrendAsPercentage;
}

function convertArrayToObject(historyArray) {
    var obj = {
        time: new Date(historyArray[0] * 1000),
        low: historyArray[1],
        high: historyArray[2],
        open: historyArray[3],
        close: historyArray[4],
        volume: historyArray[5]
    };

    return obj;
}

async function getMinuteHistory(minutesAgo, productId, granularity, minutesTo) {
    var history = [];

    var start = new Date();
    start.setMinutes(start.getMinutes() - minutesAgo);

    var end = new Date();
    if (minutesTo != 0 && minutesTo != undefined) {
        end.setMinutes(end.getMinutes() - minutesTo);
    } else {
        end.setMinutes(end.getMinutes() - (minutesAgo - 1));
    }

    await coinbaseService.getHistoricByProductId(productId, start.toISOString(), end.toISOString(), granularity).then(response => {
        history = response.slice();
    });

    return history;
}

function calcProfits(buy, sell, amount) {
    var estimatedBuyFee = buy * amount * 0.005;
    var estimatedSellFee = sell * amount * 0.005;

    var estBuyCost = buy * amount + estimatedBuyFee;
    var estSellCost = sell * amount + estimatedSellFee;

    console.log('est buy cost - ' + estBuyCost);
    console.log('est sell cost - ' + estSellCost);

    return estSellCost - estBuyCost;

}


async function watcher() {
    var productId = 'ETH-GBP';
    var buyTime = new Date();
    var buy = {};
    var totalProfits = 0;
    var immediateBuy = 0;


    var input = {
        high: [],
        low: [],
        fastPeriod: 5,
        slowPeriod: 34,
        format: (a) => parseFloat(a.toFixed(2))
    }

    var backfill = await getMinuteHistory(38, productId, 60, 1);

    backfill.forEach(element => {
        var obj = convertArrayToObject(element);
        input.high.push(obj.high);
        input.low.push(obj.low);
    });

    //we only want one active trade at a time, one buy to one sell. The first thing we want to do is buy.
    var currentSide = 'sell';
    var lastExecDateTime = new Date();

    while (true) {
        await sleep(60000);

        var ret = await getMinuteHistory(1, productId, 60);
         if (ret.length > 0) {
            lastExecDateTime = new Date();
            var prices = convertArrayToObject(ret[0]);
            input.high.push(prices.high);
            input.low.push(prices.low);
        } else {
            var diffMs = (new Date() - lastExecDateTime);
            var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
            var ret = await getMinuteHistory(diffMins, productId, 60, 1).then(r => { return r; });

            ret.forEach(r => {
                var price = convertArrayToObject(r);
                input.high.push(price.high);
                input.low.push(price.low);
            });
        }       

       // if (ret.length > 0) {
        //var prices = convertArrayToObject(ret[0]);
        //    input.high.push(prices.high);
        //    input.low.push(prices.low);
        //}
        var results = ao.calculate(input);

        if (results.length > 2) {
            console.log(results);
            var crossov = crossover(results);
            console.log(crossov);
            if (crossov != "") {
                notify.sendNotification(crossov);
                if (crossov == "cross up" && currentSide == 'buy') {
                    var prices;
                    while(prices == undefined && prices.length == 0) {
                        prices = await getMinuteHistory(1, productId, 60);
                        await sleep(10000);
                    } 

                    await coinbaseService.placeLimitOrder(productId, prices.high, 0.01, 'buy');
                    var tradeValue = prices.low * 0.01;
                    var orderIncomplete = true;

                    while (orderIncomplete) {
                        var orders = await coinbaseService.getOrders();
                        if (orders.length == 0) {
                            orderIncomplete = false;
                            notify.sendTradeNotification(productId, currentSide, tradeValue);
                        }
                        await sleep(10000);
                    }

                    //set the current side to sell so we dont make another buy.
                    currentSide = 'sell';
                }

                if (crossov == "cross down" && currentSide == 'sell') {
                    var prices;
                    while(prices == undefined && prices.length == 0) {
                        prices = await getMinuteHistory(1, productId, 60);
                        await sleep(10000);
                    } 
                    await coinbaseService.placeLimitOrder(productId, prices.low, 0.01, 'sell')
                    var tradeValue = prices.low * 0.01;
                    var orderIncomplete = true;

                    //wait for the order to be completed before moving on.
                    while (orderIncomplete) {
                        var orders = await coinbaseService.getOrders();
                        if (orders.length == 0) {
                            orderIncomplete = false;
                            notify.sendTradeNotification(productId, currentSide, tradeValue);
                        }
                        await sleep(10000);
                    }

                    currentSide = 'buy';
                }

            }
        }
    }
}

function crossover(values) {
    var length = values.length;

    if (values[length - 1] > 0 && values[length - 2] < 0) {
        return "cross up";
    } else if (values[length - 1] < 0 && values[length - 2] > 0) {
        return "cross down";
    } else {
        return "";
    }
}


function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = { calculateDifference, getUnsoldBuys, loopBuys, getHistorical, compareHistorical, watcher }

