'use strict';
const express = require('express')
const http = require('http')
var request = require('request');
var os = require('os');
var responseTime = require('response-time')
var pcap = require('pcap')

const app = express()
var server = http.createServer(app)


app.use(express.urlencoded({extended: true}));
app.use(express.json());

var friends=[]

var startat=0
app.post('/ping', function (req, res) {
  var url = req.body.url.replace(/\/$/, '');
  add_friend(url)

  startat = process.hrtime()
  request.post({url:url+'/onping', time:'true', json: {sender: myurl, vivaldi:myvivaldi.dynamic} },
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var sender = body.sender;
            var remote_vivaldi = body.vivaldi;
            var rtt = response.timings.connect;
            lastRTT = rtt;
            update(remote_vivaldi, rtt)
            // console.log('rtt: %s', rtt)
        }else 
            console.log(error)
    });

  res.send('ok') 
})


app.post('/onping', function (req, res) {
  var sender = req.body.sender.replace(/\/$/, '');
  var remote_vivaldi = req.body.vivaldi;
  add_friend(sender)

  res.json({sender: myurl, vivaldi:myvivaldi.dynamic}) 
})


app.get('/', function (req, res) {
  var txt = 'Welcome to Vivaldi.js!<br>'
  // txt = 'URL = '+url+', coordinates = ' +coords+ '<br>'
  txt += 'URL = '+myurl+', coordinates = ' +myvivaldi.dynamic.cords+ ', uncertainty = ' + myvivaldi.dynamic.uncertainty + '<br>'

  var friendList = ''
  for(var i=0; i < friends.length; i++)
    friendList += '<input type="text" id="url_'+i+'" disabled value="'+friends[i].url+'" > <input id="ping_'+i+'" type="button" value="Ping" onclick="ping(event);"> <br>'

  if (friendList.length == 0) friendList = 'No friends yet<br>'
  txt += friendList

  var ping = '<input type="text" id="url_new" > <input id="ping_new" type="button" value="Ping" onclick="ping(event);"> <br>'
  txt += ping  

  var js = `<script> 
    function ping(e){
      urlid = 'url_'+e.target.id.split('_')[1]
      url = document.getElementById(urlid).value;  
      var xhttp = new XMLHttpRequest(); 
      xhttp.onreadystatechange = function() { 
        if (this.readyState == 4 && this.status == 200) { 
          location.reload();
        } 
      }; 
      xhttp.open("POST", "/ping"); 
      xhttp.setRequestHeader("Content-Type", "application/json");
      xhttp.send(JSON.stringify({url:url}));  
    } 
  </script>`
  txt += js 

  res.send(txt)
})


// var iface = "enx106530cd1088"
// var iface = "wlp2s0"
// var iface = "lo"
var iface = "eth0"


var port = 8880
var ip = ''
var myurl = ''
var myvivaldi = {dynamic:{cords:[0,0,0], uncertainty:1000}, static:{uncertainty_factor:0.25, correction_factor:0.25}}





// server.on('connection', (socket) => {
  // socket.on('connect', () => {console.log('socket connected');})
  // socket.on('ready', () => {console.log('socket ready');})
  // socket.on('lookup', (err, add, fam, host) => {console.log('socket lookup');})
  // socket.on('data', (buff) => {console.log('socket data');})
  // socket.on('end', () => {console.log('socket end');})
  // console.log('ready to send rtt');    
  // if(lastRTT > 0)
  //   socket.write('HTTP/1.1 200 OK\r\n'+
  //              'RTT: '+lastRTT+'\r\n')
  //   lastRTT=-1;
// });


if(process.env.PORT) port = process.env.PORT

server.listen(port, function(){
  var ifaces = os.networkInterfaces();
  ip = ifaces[iface][0].address
  port = server.address().port
  myurl = 'http://'+ip+':'+port;
  console.log('Vivaldi started at: ' + myurl)

  var pcapsession = pcap.createSession(iface, 'port ' + port);
  var tcp_tracker = new pcap.TCPTracker()
  
  tcp_tracker.on('session', function (session) {
    // console.log("Start of session between " + session.src_name + " and " + session.dst_name);
    session.on('end', function (session) {
        // console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
        var stats = session.session_stats();
        console.log('connect ' + (stats.connect_duration*1000))
    });
  });


  pcapsession.on('packet', function (raw_packet) {
    var packet = pcap.decode.packet(raw_packet);
    tcp_tracker.track_packet(packet);
  });


});





function add_friend(url){
  var exists = false 
  for(var i=0; i < friends.length; i++){
    if (friends[i].url == url){
      exists = true; break;      
    }
  }
  if(!exists)
    friends.push({'url':url})   
}


function update(remote_vivaldi, rtt){
  
  var local_cords = myvivaldi.dynamic.cords;
  var local_uncertainty = myvivaldi.dynamic.uncertainty;
  var remote_cords = remote_vivaldi.cords;
  var remote_uncertainty = remote_vivaldi.uncertainty;
  
  var estimate = euclidean_dist(local_cords, remote_cords);
  var err = estimate - rtt;
  // console.log('error: %s', err)
  var rel_error = Math.abs(err)/rtt;
  var balance_uncertainty = local_uncertainty / (local_uncertainty + remote_uncertainty);


  myvivaldi.dynamic.uncertainty = rel_error * myvivaldi.static.uncertainty_factor * balance_uncertainty
        + myvivaldi.dynamic.uncertainty * (1 - myvivaldi.static.uncertainty_factor * balance_uncertainty);

  console.log('rtt: %s, error: %s, uncertainty: %s', rtt,err,myvivaldi.dynamic.uncertainty)

  var sensitivity = myvivaldi.static.correction_factor * balance_uncertainty;
  var force_vect = force_vector(local_cords, remote_cords, err)
  
  for(var i = 0; i < myvivaldi.dynamic.cords.length; i++)
    myvivaldi.dynamic.cords[i] += force_vect[i] * sensitivity;
  

}


function euclidean_dist(cord1, cord2){
  var sum = 0;
  for(var i = 0; i < cord1.length; i++)
    sum += Math.pow(cord2[i] - cord1[i], 2)
  return Math.sqrt(sum)
}

function force_vector(cord1, cord2, err){
  var force_vect = []
  var zero_vect = []
  var equal = true
  for(var i = 0; i < cord1.length; i++){
    force_vect[i] = cord2[i] - cord1[i]; //compute difference
    zero_vect[i] = 0;
    if(force_vect[i] != 0)
      equal = false
  }

  while(equal){ //generate random vector 
    for(var i = 0; i < force_vect.length; i++){
      force_vect[i] =  Math.random()*2-1;
      if (force_vect[i] != 0) 
        equal = false;
    }
  }

  var length = euclidean_dist(zero_vect, force_vect);
  for(var i = 0; i < force_vect.length; i++){
      force_vect[i] = force_vect[i]/length; //normalize
      force_vect[i] *= err; //apply error
  }
  return force_vect;
}

