const express = require('express')
const bodyParser   = require('body-parser')

const app = express()
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

boots={}

app.get('/api/list', function (req, res) {
  bootList = ''
  for (var datacenter in boots) {
    if (boots.hasOwnProperty(datacenter)) {
        instances = boots[datacenter]
        for(var i=0; i < instances.length; i++)
            bootList += instances[i].id+'@'+instances[i].url +'<br>'
        bootList += '<a href="/api/clear">Clear list</a>'
    }
  }

  if (bootList.length == 0) bootList = 'No boot nodes registered yet'
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


app.get('/', function (req, res) {
  res.send('Welcome to Koala boot server!<br>Check the <a href="/api/list">registered boot nodes</a>')
})

port = 8007
app.listen(port, () => console.log('Koala boot listening on port:' + port))

function register(nodeId, entry){
  datacenter = nodeId.split('-')[0]
  if (!(datacenter in boots))
    boots[datacenter]=[]
  boots[datacenter].push(entry)
}

function pickRandomBoot() {
    var result;
    var count = 0;
    for (var prop in boots)
        if (Math.random() < 1/++count)
           result = prop;
    return boots[result][Math.floor(Math.random() * result.length)] 
}

