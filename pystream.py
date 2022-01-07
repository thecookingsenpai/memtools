import asyncio
import json
import requests
from websockets import connect
import requests
import argparse
import random
import curses
from math import *

appTitle = "Cheetah"
appVersion = "0.1"

screen = curses.initscr()
screen.nodelay(1)
curses.noecho()
curses.cbreak()
curses.start_color()
screen.keypad( 1 )
curses.init_pair(1,curses.COLOR_BLACK, curses.COLOR_CYAN)
highlightText = curses.color_pair( 1 )
normalText = curses.A_NORMAL
screen.border( 0 )
curses.curs_set( 0 )
string = appTitle + " " + appVersion
screen.addstr(1,1,string + " - Press ESC to Exit")
screen.addstr(2,1, "== Initializing...")
screen.refresh()

columns = 150
rows = 20


box = curses.newwin(rows + 2, columns + 2, 5, 2)
box.box()


def argerror(string):
    print("[x] " + string)
    exit(-1)


#cprint(figlet_format(appTitle + " " + appVersion, font='larry3d'),
#       'green', 'on_blue', attrs=['bold'])


parser = argparse.ArgumentParser(description='Personal information')

parser.add_argument('--version', action='version', version=appTitle + " " + appVersion)
parser.add_argument('--mode', dest='mode', type=str, default="analyze", help='Working mode')
parser.add_argument('--address', dest='address', type=str, help='Address to work on')
parser.add_argument('--method', dest='method', type=str, help='Method to follow')
parser.add_argument('--raw', dest='raw', type=str, help='Raw hex in input to follow')
parser.add_argument('--to', dest='To', type=str, help='Receiver to follow')
parser.add_argument('--from', dest='From', type=str, help='Sender to follow')
parser.add_argument('--debug', dest='debug', type=str, default="false", help='Enable debug')
parser.add_argument('--lab', dest='lab', type=str, default="false", help='Enable the lab (do what u want)')
args = parser.parse_args()

with open("methods.json", "r") as methods_file:
    supported_methods = json.loads(methods_file.read())

modes = ""
supported_modes = ["analyze", "track", "snipe", "all"]
for mode in supported_modes:
    modes = modes + ", " + mode

if not args.lab == "true":

    if not args.To and not args.From and not args.address:
        curses.endwin()
        argerror("Specify an address with --address or --from / --to")

    if (args.To or args.From) and args.address:
            curses.endwin()
            argerror("If --address is set, you cannot specify single addresses")

    if args.debug == "false":
        debug = False
    elif args.debug == "true":
        debug = True
    else:
        curses.endwin()
        argerror("--debug must be either true or false")

    if not args.mode in supported_modes:
        curses.endwin()
        argerror("--mode can be: " + modes)

    if args.raw and args.method:
        curses.endwin()
        argerror("--raw and --method are exclusives")

    if args.raw:
        if not args.raw.startswith("0x") or (len(args.raw) < 3):
            curses.endwin()
            argerror("--raw must be an hex")
    if args.method:
        if not supported_methods.get(args.method):
            curses.endwin()
            argerror("This method is not supported (yet). Try with --raw")

if args.mode == "track":
    firstRand = random.randint(1,9999)
    secondRand = random.randint(1,9999)
    trackfile = str(firstRand) + str(secondRand) + ".track"

if args.mode == "sniper":
    if not args.method:
        method = "0xf305d719"
    else:
        method = args.method


headers = {
    'Content-Type': 'application/json',
}

class tx():

    def __init__(self) -> None:
        self.sender = ""
        self.receiver = ""
        self.hash = ""
        self.timestamp = ""
        self.input = ""
        self.gasPrice = ""
        self.maxFee = ""
        self.maxPriority = ""
        self.value = ""

    def show(self):
        #print(vars(self))
        ret = "From: " + self.sender + "\nTo: " + self.receiver + "\nHash: " + self.hash + \
              "\nTimestamp: " + self.timestamp + "\nGas Price: " + self.gasPrice + "\nMax fee: " + self.maxFee + \
              "\nMax priority: " + self.maxPriority + "\nValue: " + self.value + "\nInput lenght: " + self.input
        return ret

async def get_event():
    global rows
    global columns
    modestr = " Starting..."
    async with connect("ws://localhost:8546") as ws:
        # Subscribing to the mempool
        await ws.send('{"id": 1, "method": "eth_subscribe", "params": ["newPendingTransactions"]}')
        subscription_response = await ws.recv()
        #print(subscription_response)
        #print("\n")
        #print("========================================\n\n\n\n\n")

        while True:
            x = screen.getch()
            if x== 27:
                curses.endwin()
                exit()

            try:
                screen.addstr(2,1, "====== Mode: " + modestr)
                modestr = ""
                # Ignoring any kind of error, let's wait for a message from the mempool
                message = await asyncio.wait_for(ws.recv(), timeout=60)
                transaction = tx()
                hashed = json.loads(message).get("params").get("result")
                # Expanding the tx into a fully fledged tx through a raw request
                data = '{"method":"eth_getTransactionByHash","params":["' + hashed  + '"],"id":1,"jsonrpc":"2.0"}'
                response = requests.post('http://127.0.0.1:8545', headers=headers, data=data)
                jResponse = json.loads(response.text).get("result")
                # Getting the useful values we can get
                try:
                    transaction.sender = jResponse.get("from")
                    if not transaction.sender:
                        transaction.sender = ""
                    transaction.receiver = jResponse.get("to")
                    if not transaction.receiver:
                        transaction.receiver = ""
                    transaction.hash = jResponse.get("hash")
                    if not transaction.hash:
                        transaction.hash = ""
                    transaction.timestamp = jResponse.get("timestamp")
                    if not transaction.timestamp:
                        transaction.timestamp = ""
                    transaction.input = jResponse.get("input")
                    if not transaction.input:
                        transaction.input = ""
                    transaction.gasPrice = jResponse.get("gasPrice")
                    if not transaction.gasPrice:
                        transaction.gasPrice = ""
                    transaction.maxFee = jResponse.get("maxFeePerGas")
                    if not transaction.maxFee:
                        transaction.maxFee = ""
                    transaction.maxPriority = jResponse.get("maxPriorityFeePerGas")
                    if not transaction.maxPriority:
                        transaction.maxPriority = ""
                    transaction.value = jResponse.get("value")
                    if not transaction.value:
                        transaction.value = ""
                    # In debug mode always print all the txs
                    if debug:
                        string = "\n=== Debug ===\n" + transaction.show() + "\n=== Debug ===\n"
                        box.erase()
                        n = 130
                        string_array = [string[i:i+n] for i in range(0, len(string), n)]
                        for row in string_array:
                            try:
                                box.addstr(row, 3)
                                box.refresh()
                            except:
                                pass

                    # Sniping routine
                    if args.mode == "sniper":
                        if method in transaction.input:
                            modestr += "Sniped!"
                            break
                        else:
                            modestr += "Sniper mode: " + method                        
                            
                    
                    # In all mode simply print the tx but does not continue
                    if args.mode == "all":
                        modestr += "Catching all TX "
                        box.erase()
                        string = transaction.show()
                        n = 130
                        string_array = [string[i:i+n] for i in range(0, len(string), n)]
                        for row in string_array:
                            try:
                                box.addstr(row, 3)
                                box.refresh()
                            except:
                                pass
                        continue
                    
                    # Until proven wrong, assuming tx is to be printed
                    show = True

                    # Lowering the values, filters are applied                    
                    if args.address:
                        modestr += "Catching specific address (" + args.address + ")"
                        if not (transaction.sender.lower() == args.address.lower()) and not (transaction.receiver.lower() == args.address.lower()):
                            show = False
                    if args.From:
                        modestr += "Catching tx from address (" + args.From + ") "
                        if not transaction.sender.lower() == args.From.lower():
                            show = False
                    if args.To:
                        modestr += "Catching tx to address (" + args.To + ") "
                        if not transaction.receiver.lower() == args.To:
                            show = False
                    if args.method:
                        modestr += "Catching method (" + args.method + ") "
                        methodHex = supported_methods.get(args.method)
                        if not methodHex in transaction.input:
                            show = False
                    if args.raw:
                        modestr += "Catching raw value (" + args.raw + ") "
                        if not args.raw in transaction.input:
                            show = False
                    
                    # If show is still true, print the tx
                    if show:
                        box.erase()
                        string = transaction.show()
                        n = 130
                        string_array = [string[i:i+n] for i in range(0, len(string), n)]
                        for row in string_array:
                            try:
                                box.addstr(row, 3)
                                box.refresh()
                            except:
                                pass

                    # And if mode is track, put it in a file
                    if args.mode == "track":
                        modestr += "Tracking active (" + trackfile + ") "
                        with open(trackfile, "a+") as tracking:
                            tracking.write("\n")
                            tracking.write(transaction.hash)

                    
                except Exception as e:
                    screen.addstr(3,1,"Last error: " + str(e))
            except Exception as i:
                screen.addstr(3,1,"Last error: " + str(i))
            screen.refresh()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    while True:
        loop.run_until_complete(get_event())
