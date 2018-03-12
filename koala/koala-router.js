const express = require('express')
const bodyParser   = require('body-parser')
// const forward = require('http-forward')
const httpProxy = require('http-proxy');
var koala = require('./koala');
var request = require('request');

const app = express()
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
var proxy = httpProxy.createProxyServer();
proxy.on('proxyReq', function(proxyReq, req, res, options) {
  if(req.body) {
    let bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type','application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
});


nr_dc = 10
nr_nodes_x_dc = 100
services={}
koalaNode={}
boot_url = 'http://localhost:8007'

id = Math.floor(Math.random() * nr_nodes_x_dc)
dc = '0'
koala_host = '172.0.0.1'


app.get('/api/list', function (req, res) {
  srvList = 'Koala instance: ' + koalaNode.id + '<br>'
  for (var key in services) {
    if (services.hasOwnProperty(key)) {
        instances = services[key]
        for(var i=0; i < instances.length; i++){
            rn = instances[i].type == 'service' ? instances[i].name : instances[i].sname
            resp = koalaNode.getResponsible(rn)
            is_local = koalaNode.id == instances[i].koala.id ? 'local' : 'remote@'+instances[i].koala.id
            is_resp = koalaNode.id == resp.id  ? 'responsible' : 'non responsible'
            srvList +=  instances[i].type + '-' +  
            '<a target="blank" href=/api/get/'+instances[i].name+'>'+ instances[i].name + '</a> '+
            '@' + instances[i].host+':'+instances[i].port + 
            ' (' + is_local + ')' +
            ' (' + is_resp + ')' +
            '<br>'
        }
    }
}

  if (Object.keys(services).length == 0) srvList += 'No services registered yet'
  res.send(srvList)
}) 


app.get('/api/register', function (req, res) {
  res.send('Register a service')
}) 

app.post('/api/register', function (req, res) {
  service = req.body
  resp = koalaNode.getResponsible(service.name)
  registerService(service)
  if (resp.id != koalaNode.id)
    request.post(getApiUrl(resp.host, resp.port, 'register'),{ json: service },function (error, response, body) {console.log(body)});
  
  res.send('Service ' + service.name + ' registered successfully' )
})

function registerService(service){
    if(!service.hasOwnProperty('koala'))
        service.koala = koalaNode.me()
    if(!service.hasOwnProperty('type'))
        service.type = 'service'
    if (!(service.name in services))
    services[service.name]=[]
  services[service.name].push(service)
}

app.post('/api/rt', function (req, res) {
  //do stuff and send back the rt
  koalaNode.onReceiveRT(req.body);
  res.json({sender: koalaNode.me(), rt:koalaNode.rt})
})


app.post('/api/deregister', function (req, res) {
  sname = req.body.name
  resp = koalaNode.getResponsible(sname)
  if (resp.id == koalaNode.id){
      if (deregisterService(req.body))
        res.send('Service ' + sname + ' deregistered successfully' )
      else
        res.send('Service ' + sname + ' is not registered' )
  }else{
    deregisterService(req.body)
    req.body.koala = koalaNode.me()
    request.post(getApiUrl(resp.host, resp.port, 'deregister'),{ json: req.body },function (error, response, body) {res.send(body)});
  }
})

function deregisterService(service){
    //TODO: don't forget to deregister objects if the service goes down, or even when they are deleted
    sname = service.name
    if (!(sname in services)) return false;
    for(i in services[sname]){
        if(services[sname][i].host == service.host && services[sname][i].port == service.port){
            services[sname].splice(i,1)
            if(services[sname].length == 0)
                delete services[sname]
            return true;    
        }
    }
    return false;
}


app.get('/api/get/:service', function (req, res) {
    if(req.url.slice(-1) === "/")
        fwd_to_service(req,res)   
    else //what a stupid workaround, but life is too short to do things correctly
        res.redirect('/api/get/'+req.params.service+'/');
})

app.get('/api/get/:service/*', function (req, res) {
    fwd_to_service(req,res)   
})

app.post('/api/get/:service/*', function (req, res) {
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

    srvList = '<h2>Koala instance: ' + koalaNode.id + '</h2><br>'
    if (Object.keys(services).length > 0) 
        srvList += '<table style="margin: 0 auto;text-align:center"><tr><th>Type</th><th>Name</th><th>Host</th><th>Port</th><th>Location</th><th>Responsibility</th></tr>'

    for (var key in services) {
        if (services.hasOwnProperty(key)) {
            instances = services[key]
            for(var i=0; i < instances.length; i++){
                rn = instances[i].type == 'service' ? instances[i].name : instances[i].sname
                resp = koalaNode.getResponsible(rn)
                is_local = koalaNode.id == instances[i].koala.id ? 'local' : 'remote@'+instances[i].koala.id
                is_resp = koalaNode.id == resp.id  ? 'responsible' : 'non responsible'
                srvList += '<tr>'
                srvList += '<td>' + instances[i].type + '</td>' +  
                '<td><a target="blank" href=/api/get/'+instances[i].name+'>'+ instances[i].name + '</a></td> '+
                '<td>' + instances[i].host + '</td>'+
                '<td>' + instances[i].port + '</td>'+
                '<td>' + is_local + '</td>'+
                '<td>' + is_resp + '</td>'
                srvList += '</tr>'
            }
        }
    }

    if (Object.keys(services).length == 0) srvList += 'No services registered yet'
    else srvList += '</table>'
    res.send('<div style="text-align:center">'+srvList+'</div>')


})

function fwd_to_service(req,res){
    sname = req.params.service
    is_fwd = 'x-forwarded-uri' in req.headers
    is_fwd_store_perm = 'x-forwarded-koala-store' in req.headers
    fwdname = is_fwd ? sname + req.headers['x-forwarded-uri'] : ''
    is_obj_context = isInObjectContext(req)    
    objname = is_obj_context ? sname+req.headers.referer.split(sname)[1] : ''

    if(is_fwd_store_perm){
        sel = selectInstance(sname)
        service = {name:fwdname, type:'object', sname:sname, host:sel.host, port:sel.port} 
        req.url = getCallbackUrl(req.headers)
        registerService(service)
        proxyReq(req, res, getUrl(sel.host, sel.port, ''));
        return;
    }

    resp = koalaNode.getResponsible(sname)
    
    //if it is a fwd, i am not the resp and i haven't registered it, ask permission from the resp
    if (is_fwd  && resp.id != koalaNode.id && (sname in services) && !(fwdname in services) ){
        req.headers['x-forwarded-koala'] = koalaNode.meCompact()
        proxyReq(req, res, getUrl(resp.host, resp.port, ''));
        return;
    }

    searchname = is_fwd && (resp.id == koalaNode.id || fwdname in services)? fwdname : sname;
    if(is_obj_context)
        searchname = objname

    sel = selectInstance(searchname);
    if(sel) {
        is_local = koalaNode.id == sel.koala.id
        trg = ''
        if(is_local){
            req.url = req.url.split(sname)[1]
            if(is_fwd)
                req.url = getCallbackUrl(req.headers)
            trg = getUrl(sel.host, sel.port, '')
        }else{
            trg = getUrl(sel.koala.host, sel.koala.port, '')
        }
        proxyReq(req, res, trg);
    }else{
        if (resp.id == koalaNode.id){        
            if(is_fwd){
                if('x-forwarded-koala' in req.headers){
                    //another koala is asking if it can store this object locally (keep a trace and give permission)
                    senderKoala = koala.convertCompact2Obj(req.headers['x-forwarded-koala'])
                    req.headers['x-forwarded-koala-store'] = true;
                    service = {name:fwdname, type:'object', sname:sname, host:'xxx', port:'yyy', koala:senderKoala} 
                    registerService(service)
                    proxyReq(req, res, getUrl(senderKoala.host, senderKoala.port, ''));
                }else{
                    //local object (register it as a service and forward)
                    sel = selectInstance(sname)
                    service = {name:fwdname, type:'object', sname:sname, host:sel.host, port:sel.port} 
                    req.url = getCallbackUrl(req.headers)
                    registerService(service)
                    proxyReq(req, res, getUrl(sel.host, sel.port, ''));
                }
            }
            else
                res.send('No service registered with this name: ' + sname)
        }else{
            proxyReq(req, res, getUrl(resp.host, resp.port, ''));
        }
    }
    
}

function isInObjectContext(req){
    sname = req.params.service
    referer = req.headers.referer
    obj = sname+referer.split(sname)[1]
    return selectInstance(obj) != null;
}

function proxyReq(req, res, trg)
{
    proxy.web(req, res, { target: trg });
    // redirectReq(req, res, trg)
}

function redirectReq(req, res, trg) //req is for compatibility with proxyReq
{
    trg = req.url.startsWith("/") ? trg += req.url.replace('/','') : trg += req.url
    res.redirect(trg);
}

function fwdServiceResponse(error, response, body){
    console.log('miao')
}

function getApiUrl(h, p, m){
    return 'http://'+h+':'+p+'/api/'+m;
}

function getUrl(h, p, m){
    return 'http://'+h+':'+p+'/'+m;
}

function getCallbackUrl(headers){
    loc = headers['x-forwarded-location']
    callback = headers['x-forwarded-callback']
    return headers['x-forwarded-uri'].replace(loc,callback)
}

function selectInstance(sname){
    if (sname in services){
        instances = services[sname]
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

port = 8008
// port = 80
// app.listen(port, () => console.log('Koala router listening on port:' + port))


app.listen(port, function(){
    if(process.env.KOALA_BOOT_URL) boot_url = process.env.KOALA_BOOT_URL
    if(process.env.KOALA_HOST) koala_host = process.env.KOALA_HOST
    console.log('boot url: ' + boot_url)
    koalaNode = new koala.Node(koala_host, port)    
    koalaNode.register()
    
    console.log('Koala router listening on port:' + port)
    
    // n.getInfo()
});