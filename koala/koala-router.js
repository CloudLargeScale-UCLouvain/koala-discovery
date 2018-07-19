const express = require('express')
const bodyParser   = require('body-parser')
// const forward = require('http-forward')
const httpProxy = require('http-proxy');
var koala = require('./koala');
var store = require('./store');
var request = require('request');

const app = express()
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(express.static('client'))
var proxy = httpProxy.createProxyServer();
var expressWs = require('express-ws')(app);


var http = require('http');
var appserver = http.createServer(app);
appserver.on('upgrade', function (req, socket, head) {
   fwd_to_service(req, res)
   // proxyWS(req, head, 'ws://192.168.56.1:4545');
});


proxy.on('proxyReq', function(proxyReq, req, res, options) {
  if(req.body && req.headers['content-type'] != 'image/jpeg') {
    var bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type','application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
});


nr_dc = 10
nr_nodes_x_dc = 100
// services={}
koalaNode={}
boot_url = 'http://localhost:8007'
syncer_url = 'http://localhost:8005'
koala_url = 'localhost:8008'


id = Math.floor(Math.random() * nr_nodes_x_dc)
dc = '0'
koala_host = '172.0.0.1'

API_RT = '/api/rt'
API_CLEAR = '/api/clear'
API_LIST_ALL = '/api/list'
API_LIST = '/api/list/:which'
API_REGISTER = '/api/register'
API_DEREGISTER = '/api/deregister'
API_GET = '/api/get/:service'
API_GET_ALL = '/api/get/:service/*'
API_GET_OBJECT_ALL = '/api/get/:service/object/:object/callback/:callback/*'


app.get(API_REGISTER, function (req, res) {
  res.send('Register a service')
}) 

app.get(API_LIST_ALL, function (req, res) {
  list(req, res, 'all')
})

app.get(API_LIST, function (req, res) {
  list(req, res, req.params.which)
}) 

function list(req, res, which){
    if (['all', 'local', 'responsible'].indexOf(which)<0){
        res.send('Which option not supported!')
    }
    add_local = which == 'all' || which == 'local'
    add_responsible = which == 'all' || which == 'responsible'

    resp_servs = []
    for (var key in store.services) {
        if (store.services.hasOwnProperty(key)) {
            instances = store.services[key]
            for(var i=0; i < instances.length; i++){
                resp = koalaNode.getResponsible(instances[i].name)
                is_local = koalaNode.id == instances[i].koala.id 
                is_resp = koalaNode.id == resp.id  
                if(is_local && add_local)
                    resp_servs.push(instances[i])
                else if(is_resp && add_responsible)
                    resp_servs.push(instances[i])
            }
        }
    }
    res.send(resp_servs)
}


app.get(API_CLEAR, function (req, res) {
  store.clearServices()
  res.send('storage was cleared')
}) 

app.post(API_REGISTER, function (req, res) {
  service = req.body
  sent_from_koala = service.hasOwnProperty('koala')
  if (!service.name.startsWith("koala-")){ //don't register koala itself
      resp = koalaNode.getResponsible(service.name)
      store.registerServices([service])
      if (resp.id != koalaNode.id)
        request.post(getApiUrl(resp.url, 'register'),{ json: service },function (error, response, body) {console.log(body)});
      if (service.name == 'redis' && !sent_from_koala)
        request.post(syncer_url+'/add_redis',{ json: {'host':koala_host, 'port':service.port} },function (error, response, body) {console.log('Redis registered')});
   }
  res.send('Service ' + service.name + ' registered successfully' )
})



app.post(API_RT, function (req, res) {
  //do stuff and send back the rt
  neighServs = koalaNode.onReceiveRT(req.body);
  res.json({sender: koalaNode.me(), rt:koalaNode.rt, data:neighServs})
})


app.post(API_DEREGISTER, function (req, res) {
  sname = req.body.name
  resp = koalaNode.getResponsible(sname)
  if (resp.id == koalaNode.id){
      if (store.deregisterService(req.body))
        res.send('Service ' + sname + ' deregistered successfully' )
      else
        res.send('Service ' + sname + ' is not registered' )
  }else{
    store.deregisterService(req.body)
    req.body.koala = koalaNode.me()
    request.post(getApiUrl(resp.url, 'deregister'),{ json: req.body },function (error, response, body) {res.send(body)});
  }
})



app.get(API_GET, function (req, res) {
    if(req.url.slice(-1) === "/")
        fwd_to_service(req,res)   
    else //what a stupid workaround, but life is too short to do things correctly
        res.redirect('/api/get/'+req.params.service+'/');
})


app.get(API_GET_OBJECT_ALL, function (req, res) {
    // console.log('GET GET')
    fwd_to_service(req,res)   
})


app.get(API_GET_ALL, function (req, res) {
    // console.log('GET GET')
    fwd_to_service(req,res)   
})


app.post(API_GET_ALL, function (req, res) {
    fwd_to_service(req,res)   
})

app.put(API_GET_ALL, function (req, res) {
    fwd_to_service(req,res)   
})

app.delete(API_GET_ALL, function (req, res) {
    fwd_to_service(req,res)   
})





app.get('/version', function (req, res) {
    res.send('Koala v:0.1')
})


app.get('/', function (req, res) {
    // uncomment and correct when dns is needed
    // shost = req.host.split('.');
    // if(shost.length == 1)
        // res.send('Welcome to Koala. I am node '+ koalaNode.id+'.<br>Check out the <a href="/api/list">registered services</a>')

    // else{
    //     sname = shost[0];
    //     fwd_to_service(req,res,sname)   
    // }

    srvList = '<script src="home.js"></script>'
    srvList += '<h2>Koala instance: ' + koalaNode.id + '</h2><br>'
    srvList += '<div id="srvs">'
    if (Object.keys(store.services).length > 0) 
        srvList += '<table style="margin: 0 auto;text-align:center"><tr><th>Type</th><th>Name</th><th>URL</th><th>Location</th><th>Responsibility</th></tr>'

    for (var key in store.services) {
        if (store.services.hasOwnProperty(key)) {
            instances = store.services[key]
            for(var i=0; i < instances.length; i++){
                // rn = instances[i].type == 'service' ? instances[i].name : instances[i].sname
                resp = koalaNode.getResponsible(instances[i].name)
                is_local = koalaNode.id == instances[i].koala.id ? 'local' : 'remote@'+instances[i].koala.id
                is_resp = koalaNode.id == resp.id  ? 'responsible' : 'responsible@'+resp.id
                srvList += '<tr>'
                srvList += '<td>' + instances[i].type + '</td>' +  
                '<td><a target="blank" href=/api/get/'+instances[i].name+'>'+ instances[i].name + '</a></td> '+
                '<td>' + instances[i].url + '</td>'+
                '<td>' + is_local + '</td>'+
                '<td>' + is_resp + '</td>'
                srvList += '</tr>'
            }
        }
    }

    if (Object.keys(store.services).length == 0) srvList += 'No services registered yet'
    else srvList += '</table>'
    srvList += '</div><br><input type="button" onClick="aclear()" value="Clear">'
    neigsList = 'No neighbors yet'
    if(koalaNode.rt.neighbors.length > 0){
        neigsList = 'Neighbors: <br><table style="margin: 0 auto;text-align:center"><tr><th>ID</th><th>URL</th></tr>'
        for(var i = 0; i < koalaNode.rt.neighbors.length; i++)
            neigsList += '<tr><td>'+koalaNode.rt.neighbors[i].id+'</td><td><a target="blank" href="http://'+koalaNode.rt.neighbors[i].url+'">'+ koalaNode.rt.neighbors[i].url +'</a></td></tr>'
    }
    res.send('<div style="text-align:center">'+srvList + '<br><br>'+ neigsList +'</div>')


})

function fwd_to_service(req,res){fwd_to_service(req,res,null)}


function fwd_to_service(req,res){
    var params = parseRequest(req)  
    var sname = params.service
    var is_object = params.object != null 
    var is_object_store_perm = 'x-forwarded-koala-perm' in req.headers
    var object_url = 'xxx'
    var fwdname = is_object ?  params.object : ''
    var service_sel = selectInstance(sname);
    var url = ''

    if(is_object_store_perm){ //permission granted
        // sel = selectInstance(sname)
        // service = {name:fwdname, type:'object', sname:sname, url:sel.url} 
        var service = {name:fwdname, type:'object', sname:'none', url:object_url} 
        req.url = getCallbackUrl(req)
        store.registerServices([service])
        url = getUrl(req.upgrade, service_sel.url, '')
        console.log('LOCAL: '+sname + '('+fwdname+'): ' + req.method + " " + getUrl(req.upgrade, service_sel.url, req.url) )
        proxyRequest(req, res, url);
        return;    
    }

    // searchname = is_object && (resp.id == koalaNode.id || fwdname in store.services)? fwdname : sname;
    var searchname = is_object  ? fwdname : sname;
    var resp = koalaNode.getResponsible(searchname)
    
    //if it is an object, i am not the resp and i haven't registered it, ask permission from the resp
    // if (is_object && resp.id != koalaNode.id && (sname in store.services) && !(fwdname in store.services) ){
    if (is_object && resp.id != koalaNode.id && !(fwdname in store.services) ){
        req.headers['x-forwarded-koala'] = koalaNode.meCompact()
        // proxyWeb(req, res, getUrl(req.upgrade, resp.url, ''));
        url = getUrl(req.upgrade, resp.url,'')
        console.log('ASK-PERM: '+sname + '('+fwdname+'): ' + req.method + " " + url )
        proxyRequest(req, res, url);
        return;
    }

    
    
    var sel = selectInstance(searchname);
    if(sel) {
        var is_local = koalaNode.id == sel.koala.id
        var trg = ''
        if(is_local){
            req.url = getCallbackUrl(req)
            url = is_object ? service_sel.url : sel.url
            trg = getUrl(req.upgrade, url, '')
            console.log('LOCAL: '+sname + '('+fwdname+'): ' + req.method + " " + getUrl(req.upgrade, url, req.url) )
        }else{
            trg = getUrl(req.upgrade, sel.koala.url, '')
            console.log('RESP: '+sname + '('+fwdname+'): ' + req.method + " " + trg )
        }
        proxyRequest(req, res, trg);
    }else{
        if (resp.id == koalaNode.id){        
            if(is_object){
                if('x-forwarded-koala' in req.headers){
                    //another koala is asking if it can store this object locally
                    // (keep a trace and give permission)
                    var senderKoala = koala.convertCompact2Obj(req.headers['x-forwarded-koala'])
                    req.headers['x-forwarded-koala-perm'] = true;
                    var service = {name:fwdname, type:'object', sname:'none', url:object_url, koala:senderKoala} 
                    store.registerServices([service])
                    url = getUrl(req.upgrade, senderKoala.url, '')
                    console.log('GRANT-PERM: '+sname + '('+fwdname+'): ' + req.method + " " + url )
                    proxyRequest(req, res, url);
                }else{
                    //local object (register it as a service and forward)
                    // sel = selectInstance(sname)
                    // service = {name:fwdname, type:'object', sname:'none', url:sel.url} 
                    var service = {name:fwdname, type:'object', sname:'none', url:object_url} 
                    req.url = getCallbackUrl(req)
                    store.registerServices([service])
                    url = getUrl(req.upgrade, service_sel.url, '')
                    console.log('LOCAL: '+sname + '('+fwdname+'): ' + req.method + " " + getUrl(req.upgrade, service_sel.url, req.url) )
                    proxyRequest(req, res, url);
                }
            }
            else
                res.send('No service registered with this name: ' + sname)
        }else{
            url = getUrl(req.upgrade, resp.url, '')
            console.log('FWD: '+sname + '('+fwdname+'): ' + req.method + " " + url )
            proxyWeb(req, res, url);
        }
    }
    
}




function parseRequest(req){
    ret = {service:null, object:null, callback:null, rest:null}
    if(req.params){
        ret.service = req.params.service
        ret.object = req.params.object
        ret.callback = req.params.callback
    } 
    
    url = req.originalUrl ? req.originalUrl : req.url;

    if(!ret.service) ret.service = findInfo(url, "/api/get/.+?/", 'get/')
    if(!ret.object)  ret.object = findInfo(url, "/object/.+?/", 'object/') 
    if(!ret.callback) ret.callback = findInfo(url, "/callback/.+?/", 'callback/') 

    if(ret.callback) ret.rest = url.split('callback/'+ret.callback+'/')[1]    
    else if(ret.object) ret.rest = url.split('object/'+ret.object+'/')[1]    
    else if(ret.service) ret.rest = url.split(ret.service+'/')[1]    
    else ret.rest = req.originalUrl
    return ret
}

function findInfo(url, regex, static){
    var r = new RegExp(regex);
    n = r.exec(url);
    if(n) return String(n).split(static)[1].slice(0,-1)
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

function fwdServiceResponse(error, response, body){
    console.log('miao')
}

function getApiUrl(url, m){
    return 'http://'+url+'/api/'+m;
}

function getUrl(ws, url, m){
    prot = 'http'
    if(ws) 
        prot = 'ws'
    if(m && m.length > 0)
        m = m.startsWith('/') ? m : '/'+m;
    return prot+'://'+url+m;
}


function getCallbackUrl(req){
    prs = parseRequest(req)
    if (prs.callback) return '/'+prs.callback+'/'+prs.rest 
    return '/'+prs.rest
}

function selectInstance(sname){
    if (sname in store.services){
        instances = store.services[sname]
        locals = []
        remotes = []
        for(i in instances){
            is_local = koalaNode.id == instances[i].koala.id
            if(is_local)
                locals.push(instances[i])
            else
                remotes.push(instances[i])
        }
        //give priority to locals
        if(locals.length > 0)
            sel = locals[Math.floor(Math.random() * locals.length)] 
        else
            sel = remotes[Math.floor(Math.random() * remotes.length)] 
        return sel;
    }
    return null;
}


if(process.env.KOALA_BOOT_URL) boot_url = process.env.KOALA_BOOT_URL
if(process.env.KOALA_URL) koala_url = process.env.KOALA_URL
if(process.env.SYNCER_URL) syncer_url = process.env.SYNCER_URL
spt = koala_url.split(':')
koala_host = spt[0]
port = spt.length > 1 ? spt[1] : 8008


appserver.listen(port, function(){
    console.log('boot url: ' + boot_url)
    
    koalaNode = new koala.Node(koala_url)    
    koalaNode.register()

    // if(koalaNode.id == '4-64')
    //     store.registerServices([
    //         {"name": "bobi", "host": "192.168.56.100", "port": "6379"}
    //        ,{"name": "robi", "host": "192.168.56.100", "port": "6379"}
    //        ,{"name": "dobi", "host": "192.168.56.100", "port": "6379"}
    //        ,{"name": "zobi", "host": "192.168.56.100", "port": "6379"}
    //         ])


    console.log('Koala router listening on port:' + port)
});