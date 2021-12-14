const fs = require('fs');
var Web3 = require("web3");
var Tx = require('ethereumjs-tx').Transaction;
var Common = require('ethereumjs-common').default;

var url = "ws://127.0.0.1:8546";

// Defining matches
matchings = {
  "60806040":"deployment",
  "0x18cbafe5":"swapExactTokensForEth",
  "0x791ac947":"swapExactTokensForETHSupportingFeeOnTransferTokens",
  "0x7ff36ab5":"swapExactETHForTokens",
  "0xfb3bdb41":"swapETHForExactTokens"
};

var args = process.argv.slice(2);

operation = args[0];
if(operation==undefined) {
   operation = "all";
}

console.log("Operation mode: " + operation);

var options = {
  timeout: 30000,
  clientConfig: {
    maxReceivedFrameSize: 100000000,
    maxReceivedMessageSize: 100000000,
  },
  reconnect: {
    auto: true,
    delay: 5000,
    maxAttempts: 15,
    onTimeout: false,
  },
};

var web3 = new Web3(new Web3.providers.WebsocketProvider(url, options));
const subscription = web3.eth.subscribe("pendingTransactions", (err, res) => {
  if (err) console.error(err);
});

var init = function () {
  subscription.on("data", (txHash) => {
    setTimeout(async () => {
      try {
        let tx = await web3.eth.getTransaction(txHash);
	if(tx) {

    //////////////////////////////////// FUNCTION TRACKING ////////////////////////////////////

		let data = tx.input;

		if(operation=="all"){
			console.log(tx);
		} else if(operation=="deployment") {
			if(data.includes("60806040")) {
				console.log("deployment!");
				//var decodedata = hex2utf8(data);
		        	//console.log(decodedata);
				console.log(tx.hash);
                		console.log(tx.type);
	           		Object.keys(tx).forEach((prop)=> console.log(prop));	
			}

      //////////////////////////////////// WALLET TRACKING ////////////////////////////////////

		} else if(operation=="follow") {
        

        // Finding the wallet
        if(tx.from.toLowerCase()==args[1].toLowerCase() || tx.to.toLowerCase()==args[1].toLowerCase()) {
          log_tx(JSON.stringify(tx) + "\n==================\n", tx, args[1]);

          // Operation logging for given wallet
          let found = false;
          for (let match in matchings) {
            if (data.includes(match)) {
                log_tx(matchings[match], tx, args[1]);
                found = true;
              }
            }
            
            // fallback
            if(!found) {
              log_tx("Unknown method", tx, args[1]);
            }
		   }
		}
		
        }
        //console.log(tx)
      } catch (err) {
        console.error(err);
      }
    });
  });
};

function log_tx(str, tx, addy, additional="None") {
  fs.writeFileSync('tracking/' + addy,str, { flag: 'a+' });
  console.log(str);
  console.log("From: " + tx.from);
  console.log("To: " + tx.to);
  if (!(additional=="None")) {
    console.log("Additional data:\n" + additional);
  }
  console.log("\n++++++++++++++++++++++++++++++++\n\n");
}

function print(str) {
	console.log(str);
}

function hex2utf8(data) {

    var tempstr = ''
    try {
        if (data.startsWith('0x'))
            data = data.slice(2);
        tempstr = decodeURIComponent(data.replace(/\s+/g, '').replace(/[0-9a-f]{2}/g, '%$&'));
    } catch (err) {
        tempstr = hex2asc(data);
    }
    return tempstr;

}


function hex2asc(pStr) {
    tempstr = '';
    for (b = 0; b < pStr.length; b = b + 2) {
        tempstr = tempstr + String.fromCharCode(parseInt(pStr.substr(b, 2), 16));
    }
    return tempstr;
}

// Helper script that buys token from a specified address specified on text file recv.json
// The amount is specified with 'originalAmountToBuyWith' variable in the source
// The JSON file should have an array with objects with 'address' field and 'privateKey' field.
// Buys token for ${ethAmount} ETH from uniswap for address ${targetAccounts[targetIndex].address}
// targetIndex is passed as an argument: process.argv.splice(2)[0]

// var res = buyToken(targetAccounts[targetIndex], bnbAmount);
// console.log(res);

async function buyToken(tknaddress, targetAccount, amount) {
    // SPECIFY_THE_AMOUNT_OF_BNB_YOU_WANT_TO_BUY_FOR_HERE
    var originalAmountToBuyWith = '0.1';
    var ethAmount = web3.utils.toWei(originalAmountToBuyWith, 'ether');

    var targetAccounts = JSON.parse(fs.readFileSync('recv.json', 'utf-8'));

    var targetIndex = Number(process.argv.splice(2)[0]);
    var targetAccount = targetAccounts[targetIndex];

    console.log(`Buying for ${originalAmountToBuyWith} ETH from uniswap for address ${targetAccount.address}`);


    var amountToBuyWith = web3.utils.toHex(amount);
    var privateKey = Buffer.from(targetAccount.privateKey.slice(2), 'hex')  ;
    var abiArray = JSON.parse(JSON.parse(fs.readFileSync('tkn.json','utf-8')));
    var tokenAddress = tknaddress;
    var WETHAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

    var amountOutMin = '0';
    var UniswapRouterAddress = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'; // TODO

    var routerAbi = JSON.parse(fs.readFileSync('uniswap-abi.json', 'utf-8'));
    var contract = new web3.eth.Contract(routerAbi, UniswapRouterAddress, {from: targetAccount.address});
    var data = contract.methods.swapExactETHForTokens(
        web3.utils.toHex(amountOutMin),
        [WETHAddress,
         tokenAddress],
        targetAccount.address,
        web3.utils.toHex(Math.round(Date.now()/1000)+60*20),
    );

    var count = await web3.eth.getTransactionCount(targetAccount.address);
    var rawTransaction = {
        "from":targetAccount.address,
        "gasPrice":web3.utils.toHex(5000000000), // TODO
        "gasLimit":web3.utils.toHex(290000), // TODO
        "to":pancakeSwapRouterAddress,
        "value":web3.utils.toHex(amountToBuyWith),
        "data":data.encodeABI(),
        "nonce":web3.utils.toHex(count)
    };

    var transaction = new Tx(rawTransaction);
    transaction.sign(privateKey);

    var result = await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
    console.log(result)
    return result;
}


init();
