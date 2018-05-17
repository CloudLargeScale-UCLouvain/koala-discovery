const express = require('express')
const bodyParser   = require('body-parser')


const app = express()
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());



app.get('/*', function (req, res) {
	res.send(req.connection.remoteAddress.split(':')[3])
})


port = 6000
app.listen(port, function(){
    console.log('Koala origin listening on port:' + port)
});

