p = 4545
var WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({port: p})

wss.on('connection', function (ws) {
  ws.on('message', function (message) {
    console.log('Dummy received: %s', message)
  })
  console.log('connected')
})


console.log('Dummy running at ws://192.168.56.1:%s', p )