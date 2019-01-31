// const express = require('express')
// var request = require('request');
// // var pcap = require('pcap')



// const app = express()
// app.use(express.urlencoded({extended: true}));
// app.use(express.json());

// app.get('/timeout/:wait', function (req, res) {
//     var wt = parseInt(req.params.wait)
//     setInterval(function() {
//         res.end('late response');
//     },wt);
// })

// app.get('/asynchello', function (req, res) {
//      var url = 'http://localhost:4001/hello'
//      request.get(url, function(e,r,b){
//         // res.send('async ' + b)
//      })   
// })

// app.get('/hello', function (req, res) {
//     res.send('hello')    
// })

// app.get('/object/:oid/service/:sid/koala/:kid', function (req, res) {
//     if('vivaldi' in req.headers)
//         console.log(req.headers['vivaldi'])
    
//     res.send('Object: ' + req.params.oid + '<br>Service: ' + req.params.sid + '<br>Koala: ' + req.params.kid)
// })



// app.get('/*', function (req, res) {
// 	if('vivaldi' in req.headers)
// 		console.log(req.headers['vivaldi'])
// 	// res.set('vivaldi', 'leshi preshi');
// 	var url = req.originalUrl ? req.originalUrl : req.url;

//     res.send('Requested URL: ' + url + '<br>My port: ' + port)
// })


// port = 4000
// if(process.env.DUMMY_PORT) port = process.env.DUMMY_PORT

// var server = app.listen(port, function(){
//     console.log('Dummy service running on: http://localhost:' + port)

//     // var pcapsession = pcap.createSession('lo', 'port ' + port);
//     // var tcp_tracker = new pcap.TCPTracker()

//     // tcp_tracker.on('session', function (session) {
//     //     // console.log("Start of session between " + session.src_name + " and " + session.dst_name);
//     //     session.on('end', function (session) {
//     //         // console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
//     //         var stats = session.session_stats();
//     //         var rtt = stats.connect_duration*1000;
//     //         console.log('rtt: ' + rtt)
//     //         // console.log('connect ' + (stats.connect_duration*1000) + ' state ' + session.state)
//     //     });
//     // });

//     // pcapsession.on('packet', function (raw_packet) {
//     //     var packet = pcap.decode.packet(raw_packet);
//     //     tcp_tracker.track_packet(packet);
//     // });

// });

// // // server.listen(5000);

// // server.on('connection', function(socket) {
// //   console.log("A new connection was made by a client.");
// //   socket.setTimeout(30 * 1000); 
// //   // 30 second timeout. Change this as you see fit.
// // });




var http = require('http');

var server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end("Hello World");
}).on('connect', function(request, socket, head) {
    console.log('connect')
}).on('connection', function(socket) {
    var start = new Date().getTime();
    socket.on('close', function(){
        var end = new Date().getTime();
        console.log('connection closed after ' + (end -start))
    })

    socket.on('timeout', () => {
        console.log('socket timeout');
  
    });
  console.log('connection')
  // socket.setTimeout(100);
  socket.setKeepAlive(true)
}).listen(4000);

server.keepAliveTimeout = 0