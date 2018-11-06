const express = require('express')

const app = express()
app.use(express.urlencoded({extended: true}));
app.use(express.json());

var boots={};
var core=null;

app.get('/', function (req, res) {
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
        bootList += '<br><a href="/api/clear">Clear list</a>'
    }
  }

  if (bootList.length == startLength) bootList += 'No boot nodes registered yet'
  res.send(bootList)
}) 


app.get('/api/register', function (req, res) {
  res.send('Register a boot node')
}) 

app.get('/api/clear', function (req, res) {
  boots={}
  res.send('Boot nodes are cleared. Go back to the <a href="/api/list">list</a> ')
}) 


app.post('/api/register', function (req, res) {
  register(req.body.id, req.body)
  res.send('Boot node ' + req.body.id + ' registered successfully' )
})


app.post('/api/get', function (req, res) {
  
  if (Object.keys(boots).length === 0 && boots.constructor === Object)
    register(req.body.id, req.body)     
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
    var ret  = {boot: boots[result][Math.floor(Math.random() * result.length)],
                core: core}    
    return ret;
}

