const express = require('express')
var request = require('request');
var sleep = require('system-sleep');
var vivaldi = require('./vivaldi');
var utils = require('./utils');


const app = express()
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static('boot_js'))


var boots={};
var nodes={}
var core=null;

var script=`
<script src="chartist.min.js"></script>
<script src="chartist-plugin-tooltip.min.js"></script>

<script>
function removeNode(id){ httpGetAsync('api/remove_node/'+id, reload) }

function clearBoots(){ httpGetAsync('api/clear_boots', reload) }

function clearNodes(){ httpGetAsync('api/clear_nodes', reload) }

function gatherInfo(){ 
  showMsg("Gathering info from nodes...")
  httpGetAsync('api/gather_info', generateDone) 
}


function reload(){location.reload();}

function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    if(callback != null){
        xmlHttp.onreadystatechange = function() { 
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                callback(xmlHttp.responseText);
        }
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

function plotCords(){
  var s = JSON.parse(document.getElementById("dataspan").innerHTML);
  var data = { series: s};

  var options = {
    showLine: false,
    axisX: {
      type: Chartist.AutoScaleAxis,
      onlyInteger: true,
    },
    plugins: [Chartist.plugins.tooltip({
      appendToBody: true
    })]
  }

  new Chartist.Line('.ct-chart', data, options);
}

function createServices(){
  var services = prompt("Services, objects", "3,1");
  var splt = services.split(',');
  if(splt.length != 2){
    alert("Wrong params!");
    return;
  }
  var nrServices = splt[0].trim();
  var nrObjects = splt[1].trim();

  showMsg("Creating some services!")
  httpGetAsync('api/create_services/'+nrServices+'/'+nrObjects, hideMsg) 
}

function generateTraffic(){
  var iterations = prompt("Number of iterations", "3");
  showMsg("Generating some traffic, it takes a while!")
  httpGetAsync('api/generate_traffic/'+iterations, generateDone)
}

function generateDone(reply){
  var res = JSON.parse(reply);
  document.getElementById("dataspan").innerHTML = res.series;
  document.getElementById("nodeTbl").innerHTML = res.nodes;
  document.getElementById("distTbl").innerHTML = res.dists;
  hideMsg();
  plotCords();
}

function done(){alert('Done!')}

function showMsg(msg){
  document.getElementById("chart").innerHTML = '';
  document.getElementById("msg").innerHTML = msg;
  document.getElementById("info").style.display = "block";
}

function hideMsg(){
  document.getElementById("info").style.display = "none";
}
</script>

`




app.get('/', function (req, res) {
  var css = '<link rel="stylesheet" href="chartist.min.css"><link rel="stylesheet" href="chartist-plugin-tooltip.css">'
  var bootList = '<h1>Koala boot server!</h1><br>'
  var startLength = bootList.length;
  for (var datacenter in boots) {
    if (boots.hasOwnProperty(datacenter)) {
        var instances = boots[datacenter]
        var coreStr = '';
        for(var i=0; i < instances.length; i++){
            if(instances[i].core) coreStr = ' (core) ';
            bootList += instances[i].id+'@'+instances[i].url + coreStr + '<br>'
        }
        
    }

  }

  if (bootList.length != startLength)
    bootList += '<br><input value="Clear boots" onClick="clearBoots()" type="button"/>'
  else
    bootList += 'No boot nodes registered yet'
  
  var nodeList = 'Nodes: <br>'
  var startNodeLength = nodeList.length;
  // var series = [[]]
  // for (var nodeid in nodes) {
  //   if (nodes.hasOwnProperty(nodeid)) {
  //       var instance = nodes[nodeid]
  //       nodeList += instance.id+'@'+instance.url +' '+cordsToString(instance.vivaldi.cords) +'&nbsp;&nbsp;<input type="button" value="x" onClick="removeNode(\''+instance.id+'\')"/><br>'
  //       series[0].push({meta: instance.id, x:instance.vivaldi.cords[0], y:instance.vivaldi.cords[1]})
  //   }
  // }

  var nodesTbl = generateNodesTable();
  var distsTbl = generateDistanceTable();
  if(nodesTbl.length > 0)
    nodeList += '<table><tr><td id="nodeTbl">'+nodesTbl+'</td><td style="padding-left: 50px;" id="distTbl">' + distsTbl + '</td></tr></table>'

  if (nodeList.length != startNodeLength){
    nodeList += '<br><input value="Clear nodes" onClick="clearNodes()" type="button"/>'
    nodeList += '<input value="Create services" onClick="createServices()" type="button"/>'
    nodeList += '<input value="Generate traffic" onClick="generateTraffic()" type="button"/>'
    nodeList += '<input value="Gather info" onClick="gatherInfo()" type="button"/>'
    nodeList += '<input value="Plot coordinates" onClick="plotCords()" type="button"/>'
    nodeList += '<span id="dataspan" style="display:none;">'+convertCordsToSeries()+'</span>'
  }else 
    nodeList = 'No nodes registered'

  var info = '<div id="info" style="display:none;"><img src="loader.gif" style="width:500px"><div id="msg">Test</div></div>'
  var chart = '<div id="chart" class="ct-chart ct-perfect-fourth" style="width:500px"></div>'

  res.send(css+bootList+'<br><br><br>' +nodeList + info + chart + script)
}) 


app.get('/api/register', function (req, res) {
  res.send('Register a boot node')
}) 

app.get('/api/clear_boots', function (req, res) {
  boots={}
  res.send('Boot nodes are cleared. Go back to the <a href="/api/list">list</a> ')
}) 

app.get('/api/clear_nodes', function (req, res) {
  nodes={}
  res.send('Nodes are cleared.')
}) 

app.get('/api/remove_node/:nodeId', function (req, res) {
  var nid = req.params.nodeId
  if (nid in nodes){
    delete nodes[nid]
    res.send('Node removed.')
  }else
   res.send('Node does not exist.')
}) 

app.get('/api/create_services/:nrServices/:nrObjects', function (req, res) {
  var nrServices = req.params.nrServices
  var nrObjects = req.params.nrObjects
  
  for (var nodeid in nodes) {
    if (nodes.hasOwnProperty(nodeid)) {
        var instance = nodes[nodeid]
        var services = getRandomServices(nrServices, nrObjects)
        request.post({ url: instance.url+'/api/register_multi', json:{services:services}},
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log('seed services on ' + instance.id )
                }else
                    console.log(error)
            }
        );
    }
  }
  
  res.send('Done')
})

app.get('/api/gather_info', function (req, res) {
  var info = gatherInfo();
  res.json(info)
}) 

app.get('/api/generate_traffic/:iterations', function (req, res) {
  var iter = req.params.iterations
  for(var i = 0; i < iter; i++){
    for (var nodeid in nodes) {
      if (nodes.hasOwnProperty(nodeid)) {
          var instance = nodes[nodeid]
          request.get({ url: instance.url+'/api/redirect_all'},
              function (error, response, body) {
                  if (!error && response.statusCode == 200) {
                      console.log('redirect done for ' + instance.id )
                  }else
                      console.log(error)
              }
          );
          sleep(1000);
      }
    }
    sleep(1000);
  }
  var info = gatherInfo();
  res.json(info)
})



app.post('/api/register', function (req, res) {
  register(req.body.id, req.body)
  res.send('Boot node ' + req.body.id + ' registered successfully' )
})


app.post('/api/get', function (req, res) {
  var entry = req.body;
  if (Object.keys(boots).length === 0 && boots.constructor === Object)
    register(entry.id, entry)     
    nodes[entry.id] = entry
    res.json(pickRandomBoot()) 
})

app.get('/version', function (req, res) {
    res.send('Koala boot v:0.1')
})

function getRandomServices(nrServices, nrObjects){
  var dummyURL = "http://localhost:3000";
  var services = []
  var rand_services=['luke', 'leia', 'vader', 'yoda', 'obi-wan', 'han', 'chewbacca', 'r2-d2', 'c-3po']
  var rand_objects=['theforce', 'deathstar', 'milleniumfalcon']

  for(var i = 0; i < nrServices; i++){
      name = rand_services[utils.getRandomInt(1, rand_services.length-1)] 
      services.push({"name":  name, "url": dummyURL})
  }
  
  for(var i = 0; i < nrObjects; i++){
      name = rand_objects[utils.getRandomInt(1, rand_objects.length-1)]
      services.push({"type": "object", "name": name})
  }
  return services;  
}

function gatherInfo(){
  for (var nodeid in nodes) {
    if (nodes.hasOwnProperty(nodeid)) {
        var instance = nodes[nodeid]
        request.get({ url: instance.url+'/api/me'},
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var node = JSON.parse(body);
                    nodes[node.id] = node;
                }else
                    console.log(error)
            }
        );
    }
  }
  sleep(2000); //wait for some results to come
  var nodesTbl = generateNodesTable();
  var distsTbl = generateDistanceTable();
  var cords = convertCordsToSeries();
  return {nodes:nodesTbl, dists:distsTbl, series:cords}
}

// app.get('/', function (req, res) {
//   res.send('Welcome to Koala boot server!<br>Check the <a href="/api/list">registered boot nodes</a>')
// })

port = 8007
app.listen(port, () => console.log('Koala boot listening on: http://localhost:' + port))

function register(nodeId, entry){
  datacenter = nodeId.split('-')[0]
  if (!(datacenter in boots))
    boots[datacenter]=[]
  if(entry.core)
    core = entry;
  
  boots[datacenter].push(entry)
}

function pickRandomBoot() {
    var result;
    var count = 0;
    for (var prop in boots)
        if (Math.random() < 1/++count)
           result = prop;
    var ret  = {boot: boots[result][Math.floor(Math.random() * boots[result].length)],
                core: core}    
    console.log('return ' + ret.boot.id)
    return ret;
}


function cordsToString(cords){
  var s = '[';
  for(var i=0; i < cords.length; i++){
    s += cords[i].toFixed(3);
    if (i != cords.length -1) s += ', ';
  }
  s+=']';
  return s;
}

function convertCordsToSeries(){
  var series = [[]]
  for (var nodeid in nodes) {
    if (nodes.hasOwnProperty(nodeid)) {
        var instance = nodes[nodeid]
        series[0].push({meta: instance.id, x:instance.vivaldi.cords[0], y:instance.vivaldi.cords[1]})
    }
  }
  return JSON.stringify(series);
}

function generateDistanceTable(){
  var empty = true;
  var tbl = '<table style="text-align:center;"><tr><th></th>'
  for (var nodeid in nodes) {
    if (nodes.hasOwnProperty(nodeid)) {
      empty = false;
      tbl += '<th>' + nodeid + '</th>'
    }
  }
  tbl += '</tr>'

  var i = 0, j = 0;
  for (var nodeid in nodes) {
    if (nodes.hasOwnProperty(nodeid)) {
        var instancei = nodes[nodeid]
        tbl += '<tr><th>' + instancei.id + '</th>'
        for (var nodejd in nodes) {
          if (nodes.hasOwnProperty(nodejd)) {
              var instancej = nodes[nodejd]
              var dist = '-'
              // if(instancei.id != instancej.id)
              if(j > i)
                dist = vivaldi.euclidean_dist(instancei.vivaldi.cords, instancej.vivaldi.cords).toFixed(3)
              tbl += '<td>'+dist+'</td>'
              j++;
          } 
        }
        tbl += '</tr>'
        i++;
        j = 0;
    }
  }
  tbl += '</table>'
  if(empty) return ''
  return tbl;
}

function generateNodesTable(){
  var empty = true;
  var tbl = '<table>'
  for (var nodeid in nodes) {
    if (nodes.hasOwnProperty(nodeid)) {
        empty = false;
        var instance = nodes[nodeid]
        tbl += '<tr><td>' + instance.id+'@'+instance.url + 
              '</td><td>' + cordsToString(instance.vivaldi.cords) +
              '</td><td><input type="button" value="x" onClick="removeNode(\''+instance.id+'\')"/>'
              '</td></tr>'
    }
  }
  tbl += '</table>'
  if(empty) return ''
  return tbl;
}

// function calculateDistance(cord1, cord2){
//     var sum = 0;
//     for(var i = 0; i < cord1.length; i++)
//       sum += Math.pow(cord2[i] - cord1[i], 2)
//     return Math.sqrt(sum)
// }