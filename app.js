var tradeEngine = require('./tradeEngine.js');

//returns buys with no matching sell(has to round to 4 decimal places to account for fill discrepencies)
var unsoldBuys = tradeEngine.getUnsoldBuys().then(response => {
    console.log(response);
});

//look to see if anymore fills have been completed 
// if no continue with previous order
// if yes then refresh unsold buys list
//call calculate difference on all unmatched buys

console.log(unsoldBuys);
//execute function every # of milliseconds
//setInterval(tradeEngine.calculateDifference, 5000);

/* 
tradeEngine.getAccounts('GBP').then(response => {
    console.log(response);
});

tradeEngine.getAccounts('ETH').then(response => {
    console.log(response);
});

tradeEngine.getProductsByBaseCurrency('ETH').then(response => {
    console.log(response);
});

tradeEngine.getProductsByCurrencyPair('ETH-GBP').then(response => {
    console.log(response);
}) */