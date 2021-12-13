const fs = require('fs');
var Web3 = require("web3");
var url = "ws://127.0.0.1:8546";

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
		// =============================
		// Operations based on argument
		// =============================
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
        if(tx.from.toLowerCase()==args[1].toLowerCase() || tx.to.toLowerCase()==args[1].toLowerCase()) {
          log_tx(JSON.stringify(tx) + "\n==================\n", tx, args[1]);

          // Operation logging for given wallet

          if(data.includes("60806040")) {
            log_tx("deployment", tx, args[1]);
          } 
          
          else if (data.includes("0x18cbafe5")) {
            log_tx("swapExactTokensForEth", tx, args[1]);
          }

          else if (data.includes("0x791ac947")) {
            log_tx("swapExactTokensForETHSupportingFeeOnTransferTokens");
          }
          
          // fallback
          else {
            fs.writeFileSync('tracking/' + args[1],"Unknown tx", { flag: 'a+' });
            console.log("Unknown tx");
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


init();
