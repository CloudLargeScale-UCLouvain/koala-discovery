const express = require('express')
// var pcap = require('pcap')



const app = express()
app.use(express.urlencoded({extended: true}));
app.use(express.json());


app.get('/object/:oid/service/:sid/koala/:kid', function (req, res) {
    if('vivaldi' in req.headers)
        console.log(req.headers['vivaldi'])
    
    res.send('Object: ' + req.params.oid + '<br>Service: ' + req.params.sid + '<br>Koala: ' + req.params.kid)
})



app.get('/*', function (req, res) {
	if('vivaldi' in req.headers)
		console.log(req.headers['vivaldi'])
	// res.set('vivaldi', 'leshi preshi');
	var url = req.originalUrl ? req.originalUrl : req.url;

    res.send('Requested URL: ' + url + '<br>My port: ' + port)
})


port = 4000
if(process.env.DUMMY_PORT) port = process.env.DUMMY_PORT

app.listen(port, function(){
    console.log('Dummy service running on: http://localhost:' + port)

    // var pcapsession = pcap.createSession('lo', 'port ' + port);
    // var tcp_tracker = new pcap.TCPTracker()

    // tcp_tracker.on('session', function (session) {
    //     // console.log("Start of session between " + session.src_name + " and " + session.dst_name);
    //     session.on('end', function (session) {
    //         // console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
    //         var stats = session.session_stats();
    //         var rtt = stats.connect_duration*1000;
    //         console.log('rtt: ' + rtt)
    //         // console.log('connect ' + (stats.connect_duration*1000) + ' state ' + session.state)
    //     });
    // });

    // pcapsession.on('packet', function (raw_packet) {
    //     var packet = pcap.decode.packet(raw_packet);
    //     tcp_tracker.track_packet(packet);
    // });

});

