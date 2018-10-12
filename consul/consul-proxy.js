'use strict';

const express = require('express')
const bodyParser   = require('body-parser')
const httpProxy = require('http-proxy');
var request = require('request');
var srequest = require('sync-request');

const app = express()
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(express.static('client'))
var proxy = httpProxy.createProxyServer();
const url = require('url');

var http = require('http');
var appserver = http.createServer(app);
appserver.on('upgrade', function (req, socket, head) {
   fwd_to_service(req, null)
});


proxy.on('proxyReq', function(proxyReq, req, res, options) {
  if(req.body && req.headers['content-type'] != 'image/jpeg') {
    var bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type','application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
});


const API_GET = '/api/get/:service'
const API_GET_ALL = '/api/get/:service/*'
const API_GET_OBJECT_ALL = '/api/get/:service/object/:object/callback/:callback/*'

const CONSUL_API_LIST = '/v1/catalog/services'
const CONSUL_API_SERVICE = '/v1/catalog/service/'
const CONSUL_API_REGISTER = '/v1/catalog/register'
const CONSUL_API_AGENT = '/v1/agent/self'


app.get(API_GET, function (req, res) {
    if(req.url.slice(-1) === "/")
        fwd_to_service(req,res)   
    else //what a stupid workaround, but life is too short to do things correctly
        res.redirect('/api/get/'+req.params.service+'/');
})

app.get(API_GET_OBJECT_ALL, function (req, res) {fwd_to_service(req,res)})

app.get(API_GET_ALL, function (req, res) {fwd_to_service(req,res)})

app.post(API_GET_ALL, function (req, res) {fwd_to_service(req,res)})

app.put(API_GET_ALL, function (req, res) {fwd_to_service(req,res)})

app.delete(API_GET_ALL, function (req, res) {fwd_to_service(req,res)})

app.get('/version', function (req, res) {res.send('Consul proxy v:0.1')})

app.get('/', function (req, res) {
    var sres = srequest('GET', consul_url+CONSUL_API_LIST);
    var services = JSON.parse(sres.getBody('utf8'));
    var srvList = '<table>'
    var empty = true
    for (var key in services) {
        if (services.hasOwnProperty(key)) {
            empty = false;
            srvList += '<tr><td><a href="'+consul_url+CONSUL_API_SERVICE+key + '">'+key+'</a></td></tr>'
        }
    }
    srvList += '</table>'
    if (empty) srvList = 'No services registered yet'

    res.send(srvList)
})

function fwd_to_service(req,res){fwd_to_service(req,res,null)}


function fwd_to_service(req,res){
    var params = parseRequest(req)  
    var sname = params.service
    var is_object = params.object != null 
    var object_url = 'xxx'
    var fwdname = is_object ?  params.object : ''
    var service_sel = selectInstance(sname);
    var url = ''

    var searchname = is_object  ? fwdname : sname;
    
    var sel = selectInstance(searchname);
    if(sel) {
        var trg = ''
        req.url = getCallbackUrl(req)
        url = is_object ? service_sel.url : sel.url
        trg = getUrl(req.upgrade, url, '')
        console.log('LOCAL: '+sname + '('+fwdname+'): ' + req.method + " " + getUrl(req.upgrade, url, req.url) )
        proxyRequest(req, res, trg);
    }
    else{
        if(is_object){
            var service = {name:fwdname, type:'object', sname:'none', url:service_sel.url} 
            req.url = getCallbackUrl(req)
            registerServices([service])
            url = getUrl(req.upgrade, service_sel.url, '')
            console.log('LOCAL: '+sname + '('+fwdname+'): ' + req.method + " " + getUrl(req.upgrade, service_sel.url, req.url) )
            proxyRequest(req, res, url);
        }
        else
           res.send('No service registered with this name: ' + sname)
    }
    
}


function parseRequest(req){
    var ret = {service:null, object:null, callback:null, rest:null}
    if(req.params){
        ret.service = req.params.service
        ret.object = req.params.object
        ret.callback = req.params.callback
    } 
    
    var url = req.originalUrl ? req.originalUrl : req.url;

    if(!ret.service) ret.service = findInfo(url, "/api/get/.+?/", 'get/')
    if(!ret.object)  ret.object = findInfo(url, "/object/.+?/", 'object/') 
    if(!ret.callback) ret.callback = findInfo(url, "/callback/.+?/", 'callback/') 

    if(ret.callback) ret.rest = url.split('callback/'+ret.callback+'/')[1]    
    else if(ret.object) ret.rest = url.split('object/'+ret.object+'/')[1]    
    else if(ret.service) ret.rest = url.split(ret.service+'/')[1]    
    else ret.rest = req.originalUrl
    return ret
}

function findInfo(url, regex, sstatic){
    var r = new RegExp(regex);
    var n = r.exec(url);
    if(n) return String(n).split(sstatic)[1].slice(0,-1)
    return null    
}

function proxyRequest(req, res, trg)
{
    if(req.upgrade)
        proxyWS(req, res, trg)
    else
        proxyWeb(req, res, trg);
}

function proxyWeb(req, res, trg)
{
    proxy.web(req, res, { target: trg });
    // redirectReq(req, res, trg)
}

function proxyWS(req, res, trg)
{
    proxy.ws(req, req.socket, { target: trg, ws:true });
    // redirectReq(req, res, trg)
}


function redirectReq(req, res, trg) //req is for compatibility with proxyWeb
{
    trg = req.url.startsWith("/") ? trg += req.url.replace('/','') : trg += req.url
    res.redirect(trg);
}

function getApiUrl(url, m){
    return 'http://'+url+'/api/'+m;
}

function getUrl(ws, url, m){
    var prot = 'http'
    if(ws) 
        prot = 'ws'
    if(m && m.length > 0)
        m = m.startsWith('/') ? m : '/'+m;
    return prot+'://'+url+m;
}


function getCallbackUrl(req){
    var prs = parseRequest(req)
    if (prs.callback) return '/'+prs.callback+'/'+prs.rest 
    return '/'+prs.rest
}


function selectInstance(sname){
    var sres = srequest('GET', consul_url+CONSUL_API_SERVICE+sname+'?near=_agent');
    var cservices = JSON.parse(sres.getBody('utf8'));
    if(cservices.length == 0)
        return null;
    var cservice = cservices[0];
    var service = {name:cservice.ServiceName, 
        type:'service', sname:cservice.ServiceName, 
        url:cservice.ServiceAddress+':'+cservice.ServicePort};
    return service;
}


function registerServices(services){
    for(var i in services){
        var service = services[i]
        var loc = url.parse('http://'+service.url)
        var payload = {
          "Node": consul_id,
          "Address": loc.hostname,
          
          "Service": {
            "ID": service.name,
            "Service": service.name,
            "Address": loc.hostname,
            "Port": parseInt(loc.port)
          }
        }

        var sres = srequest('PUT', consul_url+CONSUL_API_REGISTER, {json: payload});
        var regrep = JSON.parse(sres.getBody('utf8'));
        console.log('request to register sent')
    }
}

function setConsulNodeID(){
    
    var sres = srequest('GET', consul_url+CONSUL_API_AGENT);
    var sagent = JSON.parse(sres.getBody('utf8'));
    consul_id = sagent.Config.NodeID;
    console.log('Consul agent: %s', consul_id)
}

function registerRedisToSyncer(){
    var redis = selectInstance('redis')
    var loc = url.parse('http://'+redis.url)
    request.post(syncer_url+'/add_redis',{ json: {'host':loc.hostname, 'port':loc.port} },
        function (error, response, body) {
            console.log('Redis registered')
        });
}


var proxy_url = 'http://localhost:8700'
var syncer_url = 'http://localhost:8006'
var consul_url = 'http://localhost:8500'


if(process.env.CONSUL_URL) consul_url = process.env.CONSUL_URL
if(process.env.PROXY_URL) proxy_url = process.env.PROXY_URL
if(process.env.SYNCER_URL) syncer_url = process.env.SYNCER_URL

var prs = url.parse(proxy_url);
var proxy_host = prs.hostname;
var port = prs.port;

var consul_id = ''

appserver.listen(port, function(){
    setConsulNodeID();
    registerRedisToSyncer();
    console.log('Consul proxy listening on port:' + port);
});