/**
 * This "Basic Signaling" library is derivation of original work of Muaz Khan [www.muazkhan.com]:
 *   -- @see                                    - [https://github.com/muaz-khan/WebRTC-Experiment/tree/master/websocket-over-nodejs]
 *   -- @copyright Copyright (c) 2017 Muaz Khan - [https://github.com/muaz-khan]
 *   -- @license The MIT License (MIT)          - [https://github.com/muaz-khan/WebRTC-Experiment/blob/master/LICENSE]
 *
 * This derivation:
 *   -- @copyright Copyright (c) 2018 Lauro Moraes - [https://github.com/subversivo58]
 *   -- @license The MIT License (MIT)             - [https://github.com/authchainjs/basic-signaling-example/blob/master/LICENSE]
 *   -- @version 0.1.0 [development stage]         - [https://github.com/authchainjs/basic-signaling-example/blob/master/VERSIONING.md]
 */

require('dotenv').config()
const http = require('http')
const fs = require('fs')
const PORT = process.env.PORT || 3000
const WebSocketServer = require('uws').Server

/**
const output = fs.createWriteStream('./stdout.log')
const errorOutput = fs.createWriteStream('./stderr.log')
// custom simple logger
const logger = new Console({
    stdout: output,
    stderr: errorOutput
})
 */


/** SERVER LOGIC ---------------------------------------------------------------------------------|
 * Instance server for static files and base to WebSockets (uws)
 * @TODO: add TLS opions (with "https" module)
 */
const server = http.createServer((req, res) => {})

server.listen(PORT)


/** SIGNALING LOGIC ------------------------------------------------------------------------------|
 * Instance server for WebSockets (uws)
 */

// allow only listed origin(s)
const originIsAllowed = origin => {
    let allowedOrigins = [
        'http://localhost' // purpose to local tests (yes, yourself test own local machine) (don't use in production)
    ]
    return allowedOrigins.includes(origin)
}

// list of backbones signaling servers on collaborate to this P2P network
const BACKNODES = [
    'ws://localhost/signaling' // localhost example
    /**

    'ws://127.0.0.1:8088/p2p',                    // other example
    'ws://another-domain:3000/sig',               // another example
    'wss://fake-non-real-signaling.herokuapp.com' // bad e.g. don't use this

     */
]

// store channels
const CHANNELS = {}

// store pools
const POOLS = {}

// store "generic" websockets ids
const WebSocketsIds = []

// create WebSocket Server (with "uws" module)
const wss = new WebSocketServer({
    server: server,
    path: '/signaling',
    // verify
    verifyClient (info, cb) {
        // Secure:
        let isSecure = info.secure
        // Request:
        let socketRequest = info.req
        // Headers:
        let socketHeaders = socketRequest.headers
        // Cookies:
        let socketCookies = socketHeaders.cookie
        // User Agent:
        let socketUA = socketHeaders['user-agent']
        // Origin (unstrusted info):
        let socketOrigin = info.origin || socketHeaders.origin || null

        // @TODO: for security, check "isSecure"
        if ( /*!isSecure || */!originIsAllowed(socketOrigin) ) {
            // @TODO: log here
            cb(false, 401, 'Unauthorized')
        } else {
            /**
             * @TODO: JSON Web Token (package: jsonwebtoken) verification with WebSocket Protocol

               if ( socketHeaders['sec-websocket-protocol'] && /authchainjs-token, /.test(socketHeaders['sec-websocket-protocol']) ) {
                   let token = socketHeaders['sec-websocket-protocol'].replace('authchainjs-token, ', '')
               }
               jwt.verify(token, 'secret-key', function (err, decoded) {
                   if ( err ) {
                       cb(false, 102, 'Close Protocol Error') // generic for failure
                   } else {
                       info.req.user = decoded // [1]
                       cb(true)
                   }
               })
            */
            cb(true)
        }
    }
})

// utilities
const UTILS = {
    /**
     * Generate UUID [long and short] [default: long]
     * @param  {Boolean} short - indicates return short UUID
     * @return {String}
     */
    uuid(short) {
        if ( short ) {
            return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        }
        let s4 = () => {
            return Math.floor(Math.random() * 0x10000).toString(16)
        }
        return s4()+s4()+'-'+s4()+'-'+s4()+'-'+s4()+'-'+s4()+s4()+s4()
    },
    /**
     * Extend objects - simple and minimalist merge objects
     * @arguments {Object}(s) - objects to merge
     * @return    {Object}    - merged objects
     * @throws    {Object}    - empty
     */
    Extend(...args) {
        try {
            return Object.assign(...args)
        } catch(e) {
            return {}
        }
    },
    /**
     * utils "is"
     */
    isObject(obj) {
        return typeof obj === 'object'
    },
    isArray(obj) {
        return Array.isArray(obj)
    }
}

// Pool list(s) creation (max 256 entires by pool)
const PoolBuilder = {
    init(targetpool, ws) {
        let pools = Object.keys(POOLS),
            pl = pools.length
        if ( pl === 0 ) {
            // generate new pool id
            console.log('Generate Pool (first Pool)')
            let poolid = UTILS.uuid()
            POOLS[poolid] = [ws.id]
            ws.pool = poolid
            return poolid
        } else if ( pl >= 1 ) {
            if ( targetpool && pools.includes(targetpool) ) {
                if ( POOLS[targetpool].length < 256 ) {
                    console.log('Current Pool have space')
                    // add current websocket id to pool
                    POOLS[targetpool].push(ws.id)
                    ws.pool = targetpool
                    return targetpool
                }
            }
            for (let i = 0; i < pl; i++) {
                 if ( pools[i].length < 256 ) {
                     // add to this pool (with key)
                     console.log('Return first Pool minor 256 peers')
                     POOLS[pools[i]].push(ws.id)
                     ws.pool = pools[i]
                     return pools[i]
                 } else if ( pools[i].length === 256 ) {
                     // generate new pool
                     console.log('Generate new Pool')
                     let poolid = UTILS.uuid()
                     POOLS[poolid] = [ws.id]
                     ws.pool = poolid
                     return poolid
                 }
            }
        }
    },
    delete(pool, id) {
        if ( POOLS[pool] && POOLS[pool].includes(id) ) {
            let index = POOLS[pool].indexOf(id)
            POOLS[pool] = POOLS[pool].splice(index, 1)
        }
    }
}

const onMessage = (message, websocket) => {

    if ( message.setupconn ) {
        websocket.send(JSON.stringify({
            list: BACKNODES,
            pool: PoolBuilder.init(message.targetpool, websocket)
        }))
    } else if ( message.checkPresence ) {
        checkPresence(message, websocket) // unused?
    } else if ( message.open ) {
        onOpen(message, websocket);
    } else if ( message.blockchain ) {
        /**
         * reserved for blockchain operation commands
         * -- use e.g: switch (message.blockchain.cmd) {}
         */
    } else {
        sendMessage(message, websocket)
    }
}

const onOpen = (message, websocket) => {
    let channel = CHANNELS[message.channel]
    if ( channel ) {
        CHANNELS[message.channel][channel.length] = websocket
    } else {
        CHANNELS[message.channel] = [websocket]
    }
}

const sendMessage = (message, websocket) => {
    message.data = JSON.stringify(message.data)
    let channel = CHANNELS[message.channel]
    if ( !channel ) {
        return
    }
    for (let i = 0; i < channel.length; i++) {
         if ( channel[i] && channel[i] != websocket ) {
             try {
                 channel[i].send(message.data)
             } catch(e) {}
         }
    }
}

const checkPresence = (message, websocket) => {
    websocket.send(JSON.stringify({
        isChannelPresent: !!CHANNELS[message.channel]
    }))
}

const swapArray = arr => {
    let swapped = [],
        length = arr.length
    for (let i = 0; i < length; i++) {
        if ( arr[i] ) {
            swapped[swapped.length] = arr[i]
        }
    }
    return swapped
}

const truncateChannels = websocket => {
    for (let channel in CHANNELS) {
         let _channel = CHANNELS[channel]
         for (let i = 0; i < _channel.length; i++) {
              if ( _channel[i] == websocket ) {
                  delete _channel[i]
              }
         }
         CHANNELS[channel] = swapArray(_channel)
         if ( CHANNELS && CHANNELS[channel] && !CHANNELS[channel].length ) {
             delete CHANNELS[channel]
         }
    }
}

wss.on('connection', function(ws) {

    // define generic socket.id
    ws.id = UTILS.uuid(true)

    // add to list id's
    WebSocketsIds.push(ws.id)

    // "flag" for check "heartbeat" connection
    ws.isAlive = true

    ws.on('pong', () => ws.isAlive = true)
    // console.log(`New socket: ${ws.id}, has been connected`)
    // show all sockets id's
    // console.log('List of sockets: ', listIds)

    // console.log(wss.clients)
    ws.on('message', function(message) {
        try {
            onMessage(JSON.parse(message), ws)
        } catch(e) {
            // @TODO: log here? - not valid `JSON` ... close connection
            ws.terminate()
        }
    });

    ws.on('close', function(CloseEventCode) {
        // console.log(`Socket id: ${ws.id}, hass been closed: ${CloseEventCode}`)
        // remove socket id from list
        if ( WebSocketsIds.includes(ws.id) ) {
            let index = WebSocketsIds.indexOf(ws.id)
            WebSocketsIds.splice(index, 1)
            // remove socket from POOL
            PoolBuilder.delete(ws.pool, ws.id)
        }
        truncateChannels(ws)
    })

})

// wss.broadcast('xxxxxxxx-yyyyyy')

// wss.startAutoPing(30000, '')

// heartbeat
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if ( ws.isAlive === false ) {
            return ws.terminate()
        }
        ws.isAlive = false
        ws.ping('', false, true)
    })
}, 30000)
