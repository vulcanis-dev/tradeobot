var tradeEngine = require('./tradeEngine.js');

//execute function every # of milliseconds
setInterval(tradeEngine.calculateDifference, 5000);

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