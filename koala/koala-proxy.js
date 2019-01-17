const express = require('express')
// const bodyParser   = require('body-parser')
// const forward = require('http-forward')

const httpProxy = require('http-proxy');
var request = require('request');

var pcap = require('pcap')

var settings = require('./settings');
var store = require('./store');
var vivaldi = require('./vivaldi');
var utils = require('./utils');
var koala = require('./koala');

const app = express()
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static('client'))
app.use(express.static('boot_js'))

var http = require('http');
var keepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 1000 });
// var proxy = httpProxy.createProxyServer({timeout:10000, proxyTimeout:10000});
var proxy = httpProxy.createProxyServer({timeout:10000, proxyTimeout:10000, agent:keepAliveAgent});
// var expressWs = require('express-ws')(app);

var srequest = require('sync-request');

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
  console.log('proxyReq %s', new Date().getTime()) 
});

proxy.on('proxyRes', function (proxyRes, req, res) {
  koalaNode.rPort = proxyRes.client.localPort;
  readPiggyback(proxyRes, req.client.remotePort);
  console.log('proxyRes %s', new Date().getTime()) 

  // console.log('i am sendong on :'  + koalaNode.rPort)
  // console.log('i am receivng on :'  + req.client.remotePort)
  // console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, true, 2));
});



API_RT = '/api/rt'
API_CLEAR = '/api/clear'
API_GENERATE_SERVICES = '/api/generate_services'
API_LIST_ALL = '/api/list'
API_LIST = '/api/list/:which'
API_REGISTER = '/api/register'
API_REGISTER_MULTI = '/api/register_multi'
API_DEREGISTER = '/api/deregister'

API_TRANSFER = '/api/transfer'
API_ONTRANSFER = '/api/ontransfer'


API_LOOKUP = '/api/lookup/:service'

API_GET = '/api/get/:service'
API_GET_ALL = '/api/get/:service/*'
API_GET_OBJECT = '/api/get/:service/object/:object'
API_GET_OBJECT_ALL = '/api/get/:service/object/:object/callback/:callback/*'
API_CLEAR_HISTORY = '/api/clear_history/:object'

API_REDIRECT = '/api/redirect/:koala'
API_ONREDIRECT = '/api/onredirect'
API_REDIRECT_ALL = '/api/redirect_all'

API_PERM = '/api/perm'
API_SETTINGS = '/api/updateSettings'

API_ME = '/api/me'


// app.get(API_REGISTER, function (req, res) {
//   res.send('Register a service')
// }) 

app.get(API_ME, function (req, res) {
  res.json(koalaNode.me(false))
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
                // resp = koalaNode.getResponsible(instances[i].name)
                is_local = koalaNode.id == instances[i].location.id 
                is_resp = koalaNode.id == instances[i].responsible.id  
                if(is_local && add_local)
                    resp_servs.push(store.instanceCopy(instances[i]))
                else if(is_resp && add_responsible)
                    resp_servs.push(store.instanceCopy(instances[i]))
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
  var service = req.body
  store.registerServices([service])
  res.send('Service ' + service.name + ' registered successfully' )
})

app.post(API_REGISTER_MULTI, function (req, res) {
  var services = req.body.services
  store.registerServices(services)
  if(req.body.locaiton)
    koalaNode.addNeighbor(req.body.locaiton) //add or update the location in the routing table
  res.send('Services registered successfully' )
})


app.post(API_RT, function (req, res) {
  //do stuff and send back the rt
  req.body.source['rPort'] = req.client.remotePort;
  neighServs = koalaNode.onReceiveRT(req.body);
  res.json({source: koalaNode.me(true), data:neighServs})
})


app.post(API_DEREGISTER, function (req, res) {
  sname = req.body.name
  //TODO this needs to be reimplemented
  // resp = koalaNode.getResponsible(sname)
  // if (resp.id == koalaNode.id){
  //     if (store.deregisterService(req.body))
  //       res.send('Service ' + sname + ' deregistered successfully' )
  //     else
  //       res.send('Service ' + sname + ' is not registered' )
  // }else{
  //   store.deregisterService(req.body)
  //   req.body.location = koalaNode.me()
  //   request.post(utils.getApiUrl(resp.url, 'deregister'),{ json: req.body },function (error, response, body) {res.send(body)});
  // }
})

app.get(API_LOOKUP, function (req, res) {
    if(req.url.slice(-1) === "/")
        lookup(req,res)   
    else 
        res.redirect('/api/lookup/'+req.params.service+'/');
})




app.get(API_GET, function (req, res) {
    console.log('router %s', new Date().getTime()) 
    fwd_to_service(req,res)   
    // if(req.url.slice(-1) === "/")
    //     fwd_to_service(req,res)   
    // else{ //what a stupid workaround, but life is too short to do things correctly
    //    console.log('redirection') 
    //    res.redirect('/api/get/'+req.params.service+'/');
    // }
})

app.get(API_GET_OBJECT, function (req, res) {
    fwd_to_service(req,res)   
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

app.get(API_CLEAR_HISTORY, function (req, res) {
    var objectID = req.params.object;
    store.clearHistory(objectID)
    res.send('OK')
})


app.post(API_ONTRANSFER, function (req, res) {
    // var service = req.body.service
    var dest = req.body.dest
    var service = req.body.service
    // var resp = koalaNode.getResponsible(service.name)

    var succ = transferObject(service.name, dest)

    if (succ){
        console.log('redirect ' + service.name +' to ' + dest)
        res.send('Cool')
    }else
        res.send('Destination or service does not exist')
   
})

app.post(API_TRANSFER, function (req, res) {
    var service = req.body.service
    console.log('')
})

app.post(API_SETTINGS, function (req, res) {
    settings.useCache = req.body.cache
    settings.cache_threshold = parseInt(req.body.cache_th)
    settings.transfer_threshold = parseInt(req.body.transfer_th)
    console.log('Settings updated to: ' + JSON.stringify(req.body))
    res.send('OK')
})

app.get('/version', function (req, res) {
    res.send('Koala v:0.1')
})

//test
app.get(API_REDIRECT, function (req, res) {
    var koalaID = req.params.koala;
    var neigh = koalaNode.getNeighborFromID(koalaID);
    redirect(neigh, req, res)    
})

app.get(API_REDIRECT_ALL, function (req, res) {
    
    for(var i = 0; i < koalaNode.rt.neighbors.length; i++){
        var neigh = koalaNode.rt.neighbors[i];
        redirect(neigh, req, res)    
    }
})

function redirect(neigh, req, res){
    if(neigh != null){
        req.url = utils.getApiUrl('','onredirect')
        proxyRequest(req, res, getUrl(req.upgrade, neigh.url, ''));
    }
}


//test
app.get(API_ONREDIRECT, function (req, res) {
    readPiggyback(req, req.client.remotePort);
    writePiggyback(req, res, true);
    res.send('Redrection answer!!')
})

app.get(API_GENERATE_SERVICES, function (req, res) {
    var dummyURL = settings.isCore ? "http://localhost:4000" : "http://localhost:5000"
    var nr_services = 3;
    var nr_objects = 1;
    var services = [];

    var name=''
    var rand_services=['luke', 'leia', 'vader', 'yoda', 'obi-wan', 'han', 'chewbacca', 'r2-d2', 'c-3po']
    var rand_objects=['theforce', 'deathstar', 'milleniumfalcon']

    for(var i = 0; i < nr_services; i++){
        name = rand_services[utils.getRandomInt(1, rand_services.length-1)] + '-' + utils.getRandomInt(1,100)
        services.push({"name":  name, "url": dummyURL})
    }
    
    if (settings.isCore){
        for(var i = 0; i < nr_objects; i++){
            name = rand_objects[utils.getRandomInt(1, rand_objects.length-1)] + '-' + utils.getRandomInt(1,100)
            services.push({"type": "object", "name": name})
        }
    }
        
    store.registerServices(services)
    res.send('Redrection answer!!')
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
    var loc = settings.isCore ? 'core' : 'edge';
    var debug = settings.debug ? ' (debug) ' : ''
    var alias = settings.alias.length > 0 ? '(' + settings.alias + ' - ' + loc + ')' : '('+loc+')';
    
    srvList = '<h2>Koala id: ' + koalaNode.id + ' ' + alias + debug +'</h2> <br>'
    
    srvList += 'URL: ' + settings.koala_url + '<br>';
    srvList += 'Coordinates = ' + vivaldi.cordsToString(koalaNode.vivaldi.cords) + '<br>Uncertainty = ' + koalaNode.vivaldi.uncertainty.toFixed(2) + '<br><br>'
    srvList += '<button class="btn" onClick="showSettings()"><i class="fa fa-cog"></i> Settings</button><br><br>'

    srvList += '<div id="srvs">'
    if (Object.keys(store.services).length > 0) 
        srvList += '<table id="serviceTable" style="margin: 0 auto;text-align:center"><tr><th></th><th>Type</th><th>Name</th><th>URL</th><th>Location</th><th>Responsibility</th><th></th><th></th></tr>'

    for (var key in store.services) {
        if (store.services.hasOwnProperty(key)) {
            instances = store.services[key]
            for(var i=0; i < instances.length; i++){
                // rn = instances[i].type == 'service' ? instances[i].name : instances[i].sname
                // resp = koalaNode.getResponsible(instances[i].name)
                is_local = koalaNode.id == instances[i].location.id ? 'local' : 'remote@'+instances[i].location.id
                is_resp = koalaNode.id == instances[i].responsible.id  ? 'responsible' : 'responsible@'+instances[i].responsible.id
                is_object = instances[i].type == 'object';
                srvList += '<tr>'
                // '+instances[i].url+'
                srvList += is_local == 'local' && is_object  ? '<td><input type="button" onClick="transfer(\''+instances[i].name+'\')" value="Transfer"></td>' : '<td></td>'
                link = is_object ? '<a target="blank" href="#" onClick="objectLink(\''+instances[i].name+'\');return false;">'+ instances[i].name + '</a>' :
                       '<a target="blank" href="/api/get/'+instances[i].name+'">'+ instances[i].name + '</a>'

                srvList += '<td>' + instances[i].type + '</td>' +  
                '<td>'+link+'</td> '+
                '<td>' + instances[i].url + '</td>'+
                '<td>' + is_local + '</td>'+
                '<td>' + is_resp + '</td>'
                srvList += is_local == 'local' && is_object  ? '<td><input type="button" onClick="clearHistory(\''+instances[i].name+'\')" value="Clear history"></td>' : '<td></td>'
                srvList += is_local == 'local' && is_object  ? '<td>'+store.getHistoryCount(instances[i].name)+'</td>' : '<td></td>'
                
                srvList += '</tr>'
            }
        }
    }

    if (Object.keys(store.services).length == 0) srvList += 'No services registered yet'
    else srvList += '</table>'
    srvList += '</div><br><input type="button" onClick="aclear()" value="Clear"> '
    srvList += '<input type="button" onClick="showCreateService()" value="Create service(s)"> '
    srvList += '<input type="button" onClick="objectLink(\'lookup\')" value="Lookup"> '
    srvList += '<input type="button" onClick="objectLink()" value="Call"> '
    srvList +='<input type="button" onClick="plotNeighs()" value="Plot neighbors">'
    neigsList = 'No neighbors yet'
    if(koalaNode.rt.neighbors.length > 0){
        neigsList = 'Neighbors: <br><br><input type="button" value="Redirect All" onClick="redirectAll()">'
        neigsList += '<table id="neighs" style="margin: 0 auto;text-align:center"><tr><th></th><th>ID</th><th>URL</th><th>Coords</th><th>Distance</th></tr>'
        for(var i = 0; i < koalaNode.rt.neighbors.length; i++)
            neigsList += '<tr><td><input type="button" value="Redirect" onClick="redirect(\''+koalaNode.rt.neighbors[i].id+'\')">'+
                         '</td><td>'+koalaNode.rt.neighbors[i].id+
                         '</td><td><a target="blank" href="'+koalaNode.rt.neighbors[i].url+'">'+
                          koalaNode.rt.neighbors[i].url +'</a></td><td>'+
                          vivaldi.cordsToString(koalaNode.rt.neighbors[i].vivaldi.cords)+
                          '</td><td>' + vivaldi.euclidean_dist(koalaNode.vivaldi.cords, koalaNode.rt.neighbors[i].vivaldi.cords).toFixed(3) +'</td></tr>'
        neigsList += '</table>'
    }

    var chart = '<div id="chart" class="ct-chart ct-perfect-fourth" style="width:500px; left:50%; transform: translate(-50%);"></div>'

    var hiddenFields='<div style="display:none">'
    hiddenFields+='<span id="coreIP">'+ utils.parseURL(koalaNode.core.url).hostname +'</span>'
    hiddenFields+='<span id="cords">' + convertCordsToSeries() + '</span>'
    hiddenFields+='<span id="settings">' + getSettings() + '</span>'
    hiddenFields+='</div>'

    var dialog = '<div id="myModal" class="modal"><div class="modal-content"><span class="close">&times;</span><p id="modal-form">Some text in the Modal..</p></div></div>'
    var scripts = '<script src="home.js"></script>'
    scripts += '<script src="chartist.min.js"></script>'
    scripts += '<script src="chartist-plugin-tooltip.min.js"></script>'
    var css = '<link rel="stylesheet" type="text/css" href="style.css">'
    css += '<link rel="shortcut icon" type="image/png" href="favicon.png"/>'
    css += '<link rel="stylesheet" href="chartist.min.css">'
    css += '<link rel="stylesheet" href="chartist-plugin-tooltip.css">'
    css += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">'
    res.send(css+'<div style="text-align:center">'+srvList + '<br><br>'+ neigsList +'</div>' + chart + hiddenFields + dialog + scripts)


})

app.post(API_PERM, function (req, res) {
    var oname = req.body.obj;
    var sender = req.body.sender;
    var sel = selectInstance(oname);
    var resp = koalaNode.getResponsible(oname)
    var url = ''
    if(sel){
        var is_local = koalaNode.id == sel.location.id
        url = is_local ? koalaNode.url : sel.location.url
        var nid = is_local ? koalaNode.id : sel.location.id
        res.json({perm:false, url: url, id:nid})
    }else{
        if (resp.id == koalaNode.id){    
            res.json({perm:true})
        }else{
            url = getUrl(req.upgrade, resp.url, '')
            var msg = 'PERM FWD: '+oname + ': ' + req.method + " " + url;
            proxyRequest(req, res, url, false, msg);
        }
    }
})


function lookup(req,res){
    var params = parseRequest(req)  
    var searchname = params.service
    var url = ''
    readPiggyback(req, req.client.remotePort);
    req.headers['x-service'] = searchname
    var resp = koalaNode.getResponsible(searchname)
    var sel = selectInstance(searchname);
    if(sel) { //service is handled by this node (either this node is responsible or object is local)
        var is_local = koalaNode.id == sel.location.id
        url = is_local ? koalaNode.url : sel.location.url
        var nid = is_local ? koalaNode.id : sel.location.id
        writePiggyback(req, res, true);
        res.json({url:url, id:nid})
    }else{
        if (resp.id == koalaNode.id){        
            res.json({err: 'No service registered with this name: ' + searchname})
        }else{
            url = getUrl(req.upgrade, resp.url, '')
            var msg = 'LOOKUP FWD: '+searchname + ': ' + req.method + " " + url
            proxyRequest(req, res, url, false, msg);
        }
    }
}


function fwd_to_service(req,res){
    var start = new Date().getTime();
    console.log('start %s',start)
    readPiggyback(req, req.client.remotePort);
    var params = parseRequest(req)  
    var sname = params.service
    
    var is_object = params.object != null 
    if(req.headers['x-ignore-object']) is_object = false;
    var oname = is_object ?  params.object : ''
    var searchname = is_object  ? oname : sname;
    req.headers['x-service'] = sname
    req.headers['x-object'] = oname

    var resp = koalaNode.getResponsible(searchname)
    if(is_object)
        handleObject(req, res, sname, oname, resp)
    else
        handleService(req, res, sname, resp)
    
    var end = new Date().getTime();
    // console.log(end-start)
    console.log('fwd %s',end)
}

function handleObject(req, res, sname, oname, resp){
    
    var object_sel = selectInstance(oname);
    var url=''
    var msg=''
    //if it is an object, i am not the resp and i haven't registered it, ask permission from the resp
    if(object_sel){
        var is_local = koalaNode.id == object_sel.location.id
        var trg = ''
        if(is_local){
            redirectToLocalObject(req, res, object_sel, oname, sname)
        }else{
            trg = getUrl(req.upgrade, object_sel.location.url, '')
            msg = 'RESP: '+sname + '('+oname+'): to ' + object_sel.location.id
            proxyRequest(req, res, trg, false, msg);
        }
    }else{
        if ( resp.id != koalaNode.id ){
            var cacheEntry = store.getFromCache(oname);
            if(cacheEntry && settings.useCache){
                url = getUrl(req.upgrade, cacheEntry.url, '')
                msg = 'CACHE-HIT: '+sname + '('+oname+'): to ' + store.cache[oname].id
                proxyRequest(req, res, url, false, msg);
            }else{
                // console.log('ASK-PERM: '+sname + '('+oname+'): ' + req.method + " " + getUrl(req.upgrade, resp.url, req.url) )
                console.log('ASK-PERM: '+sname + '('+oname+'): to ' + resp.id)
                var data = {obj: oname, sender: koalaNode.me()}
                stdRequest(false, 'POST', resp.url + '/api/perm', data, function(e, r, b){
                    var urlReq = b; //JSON.parse(b);
                    if(urlReq.perm){ //premission granted, store it locally
                        redirectToLocalObject(req, res, object_sel, oname, sname, true)
                    }else{ //permission not granted, redirect to the locaiton of the object
                        //store this to the cache to avoid further permission
                        store.storeToCache(oname, urlReq.url, urlReq.id)
                        // store.cache[oname] = {url:urlReq.url, id:urlReq.id, count:0};
                        url = getUrl(req.upgrade, urlReq.url, '')
                        msg = 'FWD: '+sname + '('+oname+'): to ' + urlReq.id
                        proxyRequest(req, res, url, false, msg);
                    }
                });

            }
            
        }else{
            redirectToLocalObject(req, res, object_sel, oname, sname, true);
        }

    }
}

function redirectToLocalObject(req, res, object_sel, oname, sname, storeToo=false){
    var service_sel = selectInstance(sname); //WHAT HAPPENS IF THIS IS NULL????

    if(storeToo){
        var obj = {name:oname, type:'object'} 
        store.registerServices([obj])
    }

    if(service_sel == null){
        req.headers['x-ignore-object'] = true
        console.log('Setting ignore-object flag')
        var resp = koalaNode.getResponsible(sname)
        handleService(req, res, sname, resp)
    }else{
        req.url = getCallbackUrl(req)
        if(object_sel && object_sel.test) req.url += '/service/'+sname+'/koala/'+koalaNode.id
        var url = getUrl(req.upgrade, service_sel.url, '')
        var msg = 'LOCAL: '+sname + '('+oname+')'
        proxyRequest(req, res, url, true, msg);
    }
}

function handleService(req, res, sname, resp){
    var url = ''
    var sel = selectInstance(sname);  
    var msg = ''  
    if(sel) { //service is handled by this node (either this node is responsible or object is local)
        var is_local = koalaNode.id == sel.location.id
        var trg = ''
        if(is_local){
            req.url = getCallbackUrl(req)
            url = sel.url
            trg = getUrl(req.upgrade, url, '')
            msg = 'LOCAL: '+sname
        }else{
            trg = getUrl(req.upgrade, sel.location.url, '')
            msg = 'RESP: '+sname + ': to ' +  sel.location.id
        }
        proxyRequest(req, res, trg, is_local, msg);
    }else{
        if (resp.id == koalaNode.id){        
            res.send('No service registered with this name: ' + sname)
        }else{
            var cacheEntry = store.getFromCache(sname);
            if(cacheEntry && settings.useCache){
                url = getUrl(req.upgrade, cacheEntry.url, '')    
                msg = 'CACHE-HIT: '+sname + ': to ' + cacheEntry.id
                proxyRequest(req, res, url,false, msg);
            }else{
                console.log('LOOKUP: '+sname + ': to ' + resp.id)
                stdRequest(false, 'GET', resp.url + '/api/lookup/' + sname, null, function(e, r, b){
                    var urlReq = JSON.parse(b);
                    if(urlReq.err){
                        res.send(urlReq.err)
                    }else{
                        url = getUrl(req.upgrade, urlReq.url, '') 
                        msg = 'FWD: '+sname + ': to ' + urlReq.id
                        proxyRequest(req, res, url, false, msg);    
                    }
                });
            }
  
        }
    }
}


function readPiggyback(req, rPort){
    if(!('piggyback' in req.headers)) return;
    var piggyback = JSON.parse(req.headers['piggyback']) 
    var sender = koalaNode.getNeighborFromID(piggyback.node.id)
    if(sender != null){ //update sender vivaldi
        sender.vivaldi = piggyback.node.vivaldi;
        sender.rPort =  rPort;
    }
    if(piggyback.source.id == koalaNode.id && piggyback.node.id != koalaNode.id){ //and if this node is not in the rt
        //i am the source
        store.storeToCache(piggyback.object, piggyback.node.url, piggyback.node.id)
        store.storeToCache(piggyback.service, piggyback.node.url, piggyback.node.id)
        // console.log('me, node ' + koalaNode.id + ' should store ' + piggyback.node.id + ' on my cache for service: ' + piggyback.service)
    }
}

function writePiggyback(req, res, isFinalResult=false){
    if(req.upgrade) return;

    var piggyback = null;

    var serv = 'x-service' in req.headers ? req.headers['x-service'] : ''
    var obj = 'x-object' in req.headers ? req.headers['x-object'] : ''

    if('piggyback' in req.headers){
        piggyback = JSON.parse(req.headers['piggyback']) 
        piggyback.node = koalaNode.me()
        if(piggyback.source.id == koalaNode.id)
            console.log("LOOKS LIKE A CYCLE")
    }else
        piggyback = {source: koalaNode.me(), service:serv, object:obj, node: koalaNode.me()}

    // console.log('piggyback: ' + JSON.stringify(piggyback) + ' final:' + isFinalResult)

    var pgbStr = JSON.stringify(piggyback);
    if(isFinalResult){
        res.set('piggyback', pgbStr);
        if(obj.length > 0){
            var entry = store.logHistory(obj, piggyback.source.id)
            if(entry != null)
                decideObjectTransfer(obj, entry)
        }
        
        // console.log('request for service ' + piggyback.service + ' is coming from node ' + piggyback.source.id + ' (i know its coords)')
    }
    else
        req.headers['piggyback'] = pgbStr;
}

function decideObjectTransfer(obj, history){
    // var dest = history.source; //can do something better with the history here 
    
    // points=[{cords:[x1,y1], weight:0.3},{cords:[x2,y2], weight:0.7}]
    var dest = null;
    var points = []
    for (var key in history.accesses) {
        if (history.accesses.hasOwnProperty(key)) {
            var neigh = key != koalaNode.id ? koalaNode.getNeighborFromID(key) : koalaNode;
            if(neigh)
                points.push({cords:neigh.vivaldi.cords, weight:history.accesses[key]})
        }
    }

    var options = [koalaNode]
    options.push.apply(options, koalaNode.rt.neighbors)

    var center = utils.gravityCenter(points)
    console.log('gravity center: ' +  vivaldi.cordsToString(center))
    var minDist = 99999;
    for(var i = 0; i < options.length; i++){
        var dist = vivaldi.euclidean_dist(center, options[i].vivaldi.cords)
        if(dist < minDist){
            minDist = dist
            dest = options[i].id
        }
    }


    if(dest != null && dest != koalaNode.id){
        console.log('Transfer ' + obj + ' to ' + dest)
        transferObject(obj, dest)
    }
    else
        console.log('Object ' + obj + ' is in the right place')
}



function transferObject(obj, dest){
    var destination = koalaNode.getNeighborFromID(dest)
    var instances = store.services[obj]
    var object_index = -1;
    var service = null;
    for(i in instances){
        is_local = koalaNode.id == instances[i].location.id
        if(is_local && obj == instances[i].name){
            service = instances[i];
            service['transfer'] = true;
            service.location = {id:destination.id, url:destination.url}
            object_index = i; 
            break;
        }
    }

    if(dest != null || object_index<0){//register 
        stdRequest(false, 'POST', utils.getApiUrl(destination.url, 'register'), service, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    if (service.responsible.id != koalaNode.id){
                        instances.splice(object_index,1) 
                        if(instances.length == 0)
                            delete store.services[obj]   
                        
                    }
                    if(settings.logObjects){
                        utils.clog(store.getNrLocalObjects())
                        utils.clog(obj+' (' + utils.getAlias(obj)+ ') moved from ' + koalaNode.id + ' ('+koalaNode.alias+')'  + ' to ' + destination.id + ' ('+destination.alias+')')
                    }
                    delete store.history[obj]
                    
                }
            });

        return true;
    }

    return false;

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
    else if(ret.object && url.split('object/'+ret.object+'/').length > 1) ret.rest = url.split('object/'+ret.object+'/')[1]; 
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

function stdRequest(sync, method, url, data=null, callback=null){
    if(sync){
        var req = null;
        if(method == 'GET'){
            req = srequest('GET', url);
        }else{
            req = srequest('POST', url, data);
        }
        console.log(url + ' replied syncilly')        
        return JSON.parse(req.getBody('utf8'))
    }else{
        if(method == 'GET'){
            request.get(url, callback)
        }else{
            request.post(url, { json: data }, callback)
        }
    }
}

function proxyRequest(req, res, trg, final=false, msg='')
{
    if(msg.length > 0)
        console.log(msg)
    
    writePiggyback(req, res, final)
    if(req.upgrade)
        proxyWS(req, res, trg)
    else
        proxyWeb(req, res, trg);
}

function proxyWeb(req, res, trg)
{
    proxy.web(req, res, { target: trg }, proxyError);
    // redirectReq(req, res, trg)
}

function proxyWS(req, res, trg)
{
    proxy.ws(req, req.socket, { target: trg, ws:true }, proxyError);
    // redirectReq(req, res, trg)
}

function proxyError(err,req, res){

    console.log(err.message)
    res.end(err.message)
}


function redirectReq(req, res, trg) //req is for compatibility with proxyWeb
{
    trg = req.url.startsWith("/") ? trg += req.url.replace('/','') : trg += req.url
    res.redirect(trg);
}


function getUrl(ws, url, m){
    var lurl = url
    if(ws) 
        lurl = url.replace('http://','ws://')
    if(m && m.length > 0)
        m = m.startsWith('/') ? m : '/'+m;
    return lurl+m;
}


function getCallbackUrl(req){
    prs = parseRequest(req)
    if (prs.callback) return '/'+prs.callback+'/'+prs.rest 
    return '/'+prs.rest
}

function selectInstance(sname){
    if (!(sname in store.services)) return null;
    
    instances = store.services[sname]
    locals = []
    remotes = []
    for(i in instances){
        is_local = koalaNode.id == instances[i].location.id
        if(is_local)
            locals.push(instances[i])
        else
            remotes.push(instances[i])
    }
    //give priority to locals
    if(locals.length > 0)
        sel = locals[Math.floor(Math.random() * locals.length)] 
    else{
        //find here the one with the closest cordinates 
        sel = remotes[Math.floor(Math.random() * remotes.length)] 
    }
    return sel;
    
}

function convertCordsToSeries(){
  var options = [koalaNode]
  options.push.apply(options, koalaNode.rt.neighbors)
  var series = [[]]
  for (var i =0; i < options.length; i++ ) {
    var instance = options[i]
    series[0].push({meta: instance.id+' ('+instance.alias+') ', x:instance.vivaldi.cords[0], y:instance.vivaldi.cords[1]})
    
  }
  return JSON.stringify(series);
}

function getSettings(){
    var sets = {cache:settings.useCache, cache_th:settings.cache_threshold, transfer_th:settings.transfer_threshold}
    return JSON.stringify(sets);
}


function onRegister(){
    // console.log("ready")
     // //debug

    if(settings.debug){ 
        var srvurl = 'http://'+utils.parseURL(koalaNode.core.url).hostname + ':4000';
        store.registerServices([{'test':true, 'name':'dummyService', 'url':srvurl}]);
        
        // if(settings.isCore){
        //     store.registerServices([{'test':true, 'type':'object', 'name':'dummyobj'}]);
        // }
    }
}



koalaNode={}
// id = Math.floor(Math.random() * nr_nodes_x_dc)
// dc = '0'



if(process.env.KOALA_BOOT_URL) settings.boot_url = process.env.KOALA_BOOT_URL
if(process.env.IFACE) settings.iface = process.env.IFACE
if(process.env.PORT) settings.port = process.env.PORT    
if(process.env.ALIAS) settings.alias = process.env.ALIAS    
if(process.env.MODE) settings.mode = process.env.MODE    
if(process.env.TRANSFER_THRESHOLD) settings.transfer_threshold = parseInt(process.env.TRANSFER_THRESHOLD)

settings.koala_url = process.env.KOALA_URL ? process.env.KOALA_URL : utils.getDefaultURL(settings.iface, settings.port)
if(process.env.SYNCER_URL) settings.syncer_url = process.env.SYNCER_URL
if(process.env.CORE) settings.isCore = process.env.CORE == 'true'
if(process.env.DEBUG) settings.debug = process.env.DEBUG == 'true'

console.log(utils.getDefaultURL(settings.iface, settings.port))


var prs = utils.parseURL(settings.koala_url);
settings.koala_host = prs.hostname
var port = prs.port

appserver.listen(port, function(){
    console.log('boot url: ' + settings.boot_url)
    
    koalaNode = new koala.Node(settings.koala_url)    
    koalaNode.register(onRegister)

    utils.loadAliases();

    var chrome_ports = [9229, 9329, 9222, 9230, 5037]
    var filter = 'tcp'
    for(var i in chrome_ports)
        filter += ' and not port ' + chrome_ports[i]

    var pcapsession = pcap.createSession(settings.iface, filter);
    var tcp_tracker = new pcap.TCPTracker()

    tcp_tracker.on('session', function (session) {
        // console.log("Start of session between " + session.src_name + " and " + session.dst_name);
        var src = utils.parseURL(utils.addProt(session.src_name))
        var dst = utils.parseURL(utils.addProt(session.dst_name))
        var srcPort = src.port
        var dstPort = dst.port
        if (srcPort != koalaNode.rPort && dstPort != port) return;
        
        session.on('end', function (session) {
            // console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
            var stats = session.session_stats();
            var rtt = stats.connect_duration*1000;
            // console.log('rtt : ' + rtt)
            if(srcPort == koalaNode.rPort){
              var dstFriend = koalaNode.getNeighborFromURL(utils.addProt(session.dst_name), false);
              if(dstFriend != null){
                // console.log('onsend: update with ' + rtt + ' for ' + dstFriend.url)  
                vivaldi.update(dstFriend.vivaldi, rtt)
              }
            }else{
              var srcFriend = koalaNode.getNeighborFromURL(utils.addProt(session.src_name), true)  
              if(srcFriend != null){
                // console.log('onreceive: update with ' + rtt + ' for ' + srcFriend.url)  
                vivaldi.update(srcFriend.vivaldi, rtt)
              }  
            }
            // console.log('connect ' + (stats.connect_duration*1000) + ' state ' + session.state)
        });
    });

    pcapsession.on('packet', function (raw_packet) {
        var packet = pcap.decode.packet(raw_packet);
        tcp_tracker.track_packet(packet);
    });
      

    // utils.clog('mihehe i started')
    console.log('Koala proxy running at: ' + settings.koala_url)
});


