const express = require('express')
const bodyParser   = require('body-parser')


const app = express()
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());


const httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer();

proxy.on('proxyReq', function(proxyReq, req, res, options) {
  if(req.body) {
    let bodyData = JSON.stringify(req.body);
    // incase if content-type is application/x-www-form-urlencoded -> we need to change to application/json
    proxyReq.setHeader('Content-Type','application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    // stream the content
    proxyReq.write(bodyData);
  }
});

app.post('/api/get/*', function (req, res) {
	req.url = req.url.split('service')[1]
	proxy.web(req, res, {target: getUrl('localhost', '3000', '') });  
})


app.get('/api/get/*', function (req, res) {
	req.url = req.url.split('service')[1]
	proxy.web(req, res, {target: getUrl('localhost', '3000', '') });  
})




port = 4000
app.listen(port, function(){
    
    console.log('Koala router listening on port:' + port)
    
    // n.getInfo()
});


function getUrl(h, p, m){
	sm = m.startsWith("/") ? m : '/'+m
    return 'http://'+h+':'+p+sm;
    // return 'http://'+h+':'+p;
}
