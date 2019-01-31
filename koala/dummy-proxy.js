var http = require('http'),
httpProxy = require('http-proxy');
var keepAliveAgent = new http.Agent({ keepAlive: true});


var proxy = httpProxy.createProxyServer({agent:keepAliveAgent});


var server = http.createServer(function(req, res) {
  // You can define here your custom logic to handle the request
  // and then proxy the request.
  proxy.web(req, res, { target: 'http://127.0.0.1:4000' });
});

console.log("listening on port 5000")
server.listen(5000);
server.keepAliveTimeout = 0