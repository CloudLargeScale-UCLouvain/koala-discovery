const express = require('express')
var request = require('request');

const app = express()
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static('boot_js'))


var boots={};
var nodes={}
var core=null;

var script=`
<script src="chartist.min.js"></script>

<script>
function removeNode(id){ httpGetAsync('api/remove_node/'+id, reload) }

function clearBoots(){ httpGetAsync('api/clear_boots', reload) }

function clearNodes(){ httpGetAsync('api/clear_nodes', reload) }

function gatherInfo(){ httpGetAsync('api/gather_info', reload) }


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
    }
  }

  new Chartist.Line('.ct-chart', data, options);
}

</script>

`




app.get('/', function (req, res) {
  var css = '<link rel="stylesheet" href="chartist.min.css">'
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
  var series = [[]]
  for (var nodeid in nodes) {
    if (nodes.hasOwnProperty(nodeid)) {
        var instance = nodes[nodeid]
        nodeList += instance.id+'@'+instance.url +' '+cordsToString(instance.vivaldi.cords) +'&nbsp;&nbsp;<input type="button" value="x" onClick="removeNode(\''+instance.id+'\')"/><br>'
        series[0].push({x:instance.vivaldi.cords[0], y:instance.vivaldi.cords[1]})
    }
  }

  if (nodeList.length != startNodeLength){
    nodeList += '<br><input value="Clear nodes" onClick="clearNodes()" type="button"/>'
    nodeList += '<input value="Gather info" onClick="gatherInfo()" type="button"/>'
    nodeList += '<input value="Plot coordinates" onClick="plotCords()" type="button"/>'
    nodeList += '<span id="dataspan" style="display:none;">'+JSON.stringify(series)+'</span>'
  }else 
    nodeList = 'No nodes registered'

  var chart='<div class="ct-chart ct-perfect-fourth" style="width:500px"></div>'

  res.send(css+bootList+'<br><br><br>' +nodeList + chart + script)
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

app.get('/api/gather_info', function (req, res) {
  
  
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

  res.send('Done')
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

// function convertCordsToSeries(){
//   var series = [[]]
//   for (var nodeid in nodes) {
//     if (nodes.hasOwnProperty(nodeid)) {
//         var instance = nodes[nodeid]
//         series[0][0].push({x:instance.vivaldi.cords[0], y:instance.vivaldi.cords[1]})
//     }
//   }
//   return series; 
// }