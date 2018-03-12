var http         = require('http')
var Router       = require('router')
var finalhandler = require('finalhandler')
var compression  = require('compression')
var bodyParser   = require('body-parser')
const forward = require('http-forward')

// store our message to display
var message = "Hello World!"
var opts = { mergeParams: true }
// initialize the router & server and add a final callback.
var router = Router()
var server = http.createServer(function onRequest(req, res) {
  router(req, res, finalhandler(req, res))
})

// use some middleware and compress all outgoing responses
router.use(compression())

var handler = Router()
router.use('/koala/api', handler)

handler.get('/register', function (req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end('Register stuff \n')
  // res.end('This is project ' + req.params.pid + '\n')
})


router.get('/*', function (req, res) {
  req.forward = { target: 'http://localhost:3001' }
  forward(req, res)
})



server.listen(3002)
console.log('Koala router running at http://127.0.0.1:3002/');