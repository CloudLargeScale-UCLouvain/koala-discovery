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
   fwd_to_service(req, res, head)
   // proxyWS(req, head, 'ws://192.168.56.1:4545');
});


proxy.on('proxyReq', function(proxyReq, req, res, options) {
  if(req.body) {
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
API_REGISTER = '/api/register'
API_DEREGISTER = '/api/deregister'
API_GET = '/api/get/:service'
API_GET_ALL = '/api/get/:service/*'
API_GET_OBJECT_ALL = '/api/get/:service/object/:object_id/callback/:callback_id/*'


app.get(API_REGISTER, function (req, res) {
  res.send('Register a service')
}) 

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
                rn = instances[i].type == 'service' ? instances[i].name : instances[i].sname
                resp = koalaNode.getResponsible(rn)
                is_local = koalaNode.id == instances[i].koala.id ? 'local' : 'remote@'+instances[i].koala.id
                is_resp = koalaNode.id == resp.id  ? 'responsible' : 'non responsible'
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
    res.send('<div style="text-align:center">'+srvList+'</div>')


})

function fwd_to_service(req,res){fwd_to_service(req,res,null)}


function fwd_to_service(req,res,head){
    sname = getServiceName(req) 
    is_fwd = req.params && 'object_id' in req.params 
    is_fwd_store_perm = 'x-forwarded-koala-perm' in req.headers
    fwdname = is_fwd ? sname + '/' + req.params.object_id : ''
    
    if(is_fwd_store_perm){
        sel = selectInstance(sname)
        service = {name:fwdname, type:'object', sname:sname, url:sel.url} 
        req.url = getCallbackUrl(req)
        store.registerServices([service])
        proxyWeb(req, res, getUrl(req.upgrade, sel.url, ''));
        return;    
    }

    resp = koalaNode.getResponsible(sname)
    
    //if it is a fwd, i am not the resp and i haven't registered it, ask permission from the resp
    if (is_fwd  && resp.id != koalaNode.id && (sname in store.services) && !(fwdname in store.services) ){
        req.headers['x-forwarded-koala'] = koalaNode.meCompact()
        proxyWeb(req, res, getUrl(req.upgrade, resp.url, ''));
        return;
    }

    searchname = is_fwd && (resp.id == koalaNode.id || fwdname in store.services)? fwdname : sname;
    
    sel = selectInstance(searchname);
    if(sel) {
        is_local = koalaNode.id == sel.koala.id
        trg = ''
        if(is_local){
            req.url = req.url.split(sname)[1]
            if(is_fwd)
                req.url = getCallbackUrl(req)
            trg = getUrl(req.upgrade, sel.url, '')
            console.log(sname + ': ' + req.method + " " + getUrl(req.upgrade, sel.url, req.url) )
        }else{
            trg = getUrl(req.upgrade, sel.koala.url, '')
        }
        if(req.upgrade)
            proxyWS(req, head, trg)
        else
            proxyWeb(req, res, trg);
    }else{
        if (resp.id == koalaNode.id){        
            if(is_fwd){
                if('x-forwarded-koala' in req.headers){
                    //another koala is asking if it can store this object locally
                    // (keep a trace and give permission)
                    senderKoala = koala.convertCompact2Obj(req.headers['x-forwarded-koala'])
                    req.headers['x-forwarded-koala-perm'] = true;
                    service = {name:fwdname, type:'object', sname:sname, url:'xxx', koala:senderKoala} 
                    store.registerServices([service])
                    proxyWeb(req, res, getUrl(req.upgrade, senderKoala.url, ''));
                }else{
                    //local object (register it as a service and forward)
                    sel = selectInstance(sname)
                    service = {name:fwdname, type:'object', sname:sname, url:sel.url} 
                    req.url = getCallbackUrl(req)
                    store.registerServices([service])
                    proxyWeb(req, res, getUrl(req.upgrade, sel.url, ''));
                }
            }
            else
                res.send('No service registered with this name: ' + sname)
        }else{
            proxyWeb(req, res, getUrl(req.upgrade, resp.url, ''));
        }
    }
    
}




function getServiceName(req){
    if(req.params && req.params.sname)
        return req.params.service

    params = req.url.split('/')
    if(params.length > 3)
        return params[3] 
}


function proxyWeb(req, res, trg)
{
    proxy.web(req, res, { target: trg });
    // redirectReq(req, res, trg)
}

function proxyWS(req, head, trg)
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
    m = m.startsWith('/') ? m : '/'+m;
    return prot+'://'+url+m;
}


function getCallbackUrl(req){
    return '/'+req.params.callback_id+'/'+req.params[0]
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
// app.listen(port, function(){
    console.log('boot url: ' + boot_url)
    
    koalaNode = new koala.Node(koala_url)    
    koalaNode.register()

    if(koalaNode.id == '8-88')
        store.registerServices([{"name": "bobi", "host": "192.168.56.100", "port": "6379"}])

    console.log('Koala router listening on port:' + port)
    // koalaNode.getInfo()
});