'use strict';
const express = require('express')
const http = require('http')
const urlparser = require('url');
var request = require('request');
var os = require('os');
var responseTime = require('response-time')
var pcap = require('pcap')


const app = express()
var server = http.createServer(app)


app.use(express.urlencoded({extended: true}));
app.use(express.json());

var friends=[]


app.post('/ping', function (req, res) {
  var url = req.body.url.replace(/\/$/, '');
  add_friend({url:url}) //just add url then update the coordinates on response

  request.post({url:url+'/onping', time:'true', json: {sender: myurl, vivaldi:myvivaldi.dynamic} },
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var sender = body.sender;
            var remote_vivaldi = body.vivaldi;
            var rtt = response.timings.connect;
            rtt -= 1 //remove some additional latency
            // rtt -= getRand(0.6, 1.3); //remove some additional latency
            
            add_friend({url:url,vivaldi:remote_vivaldi})
            update(remote_vivaldi, rtt)
            
        }else 
            console.log(error)
    })

  res.send('ok') 
})

function getRand(min, max)
{
  return Math.random() * (max - min) + min
}

function cordsToString(cords){
  var s = '[';
  for(var i=0; i < cords.length; i++){
    s += cords[i].toFixed(2);
    if (i != cords.length -1) s += ', ';
  }
  s+=']';
  return s;
}

app.post('/onping', function (req, res) {
  var sender_url = req.body.sender.replace(/\/$/, '');
  var remote_vivaldi = req.body.vivaldi;
  add_friend({url:sender_url, vivaldi:remote_vivaldi, remote_port:req.client.remotePort})
  res.json({sender: myurl, vivaldi:myvivaldi.dynamic}) 
})


app.get('/', function (req, res) {
  var txt = '<div align="center"><h2>Welcome to Vivaldi.js!</h2><br>'
  txt += 'URL = '+myurl+'<br>coordinates = ' + cordsToString(myvivaldi.dynamic.cords) + '<br>uncertainty = ' + myvivaldi.dynamic.uncertainty.toFixed(2) + '<br><br>'

  var friendList = 'Friends:<br>'
  for(var i=0; i < friends.length; i++)
    friendList += '<input type="text" id="url_'+i+'" disabled value="'+friends[i].url+'" > <input id="ping_'+i+'" type="button" value="Ping" onclick="ping(event);"> <br>'

  if (friendList.length == 12) friendList = 'No friends yet<br>'
  
  txt += friendList + '<br>'

  var ping = '<input type="text" id="url_new" > <input id="ping_new" type="button" value="Ping" onclick="ping(event);"> </div><br>'
  txt += ping  

  var js = `<script> 
    function ping(e){
      urlid = 'url_'+e.target.id.split('_')[1]
      url = document.getElementById(urlid).value;  
      if(url.length == 0) {alert('empty url dawg!'); return;}
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


var port = 0
var ip = ''
var myurl = ''
var myvivaldi = {dynamic:{cords:[0,0,0], uncertainty:1000}, static:{uncertainty_factor:0.25, correction_factor:0.25}}



if(process.env.PORT) port = process.env.PORT
if(process.env.IFACE) iface = process.env.IFACE

server.listen(port, function(){
  var ifaces = os.networkInterfaces();
  ip = ifaces[iface][0].address
  port = server.address().port
  myurl = add_prot(ip+':'+port);
  console.log('Vivaldi started at: ' + myurl)

  var pcapsession = pcap.createSession(iface, 'port ' + port);
  var tcp_tracker = new pcap.TCPTracker()
  
  tcp_tracker.on('session', function (session) {
    // console.log("Start of session between " + session.src_name + " and " + session.dst_name);
    session.on('end', function (session) {
        // console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
        var stats = session.session_stats();
        var rtt = stats.connect_duration*1000;
        var friend = get_friend_from_remotePort(session.src_name)
        if(friend != null){
          update(friend.vivaldi, rtt)
        }
        // console.log('connect ' + (stats.connect_duration*1000) + ' state ' + session.state)
    });
  });

  pcapsession.on('packet', function (raw_packet) {
    var packet = pcap.decode.packet(raw_packet);
    tcp_tracker.track_packet(packet);
  });

});


function add_friend(friend){
  var existingFriend = get_friend(friend.url) 
  var exists = existingFriend != null;
  if(!exists)
    friends.push(friend)   
  else{ //update
    existingFriend.vivaldi = friend.vivaldi;
    existingFriend.remote_port = friend.remote_port;
  }
}

function get_friend(url){
  for(var i=0; i < friends.length; i++){
    if (friends[i].url == url)
      return friends[i];   
  }
  return null;
}

function add_prot(url){
  return 'http://'+url;
}

function get_friend_from_remotePort(url){
  var prs = urlparser.parse(add_prot(url));
  var host  = prs.hostname; 
  var rport = prs.port;
  for(var i=0; i < friends.length; i++){
    prs = urlparser.parse(friends[i].url);
    if(prs.hostname == host && friends[i].remote_port == rport)
      return friends[i];   
  }
  return null;
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
  // console.log(rtt-100)

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

