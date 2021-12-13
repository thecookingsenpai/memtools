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
		} else if(operation=="follow") {
                  if(tx.from==args[1]) {
			console.log(tx);
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
