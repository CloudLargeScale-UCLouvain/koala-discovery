const express = require('express')
const bodyParser   = require('body-parser')


const app = express()
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());


app.post('/api/get/*', function (req, res) {
	req.url = req.url.split('service')[1]
    trg = getUrl('localhost', '3000', req.url)
    res.redirect(trg)
})


app.get('/api/get/*', function (req, res) {
	req.url = req.url.split('service')[1]
    trg = getUrl('localhost', '3000', req.url)
    // trg = 'http://localhost:3000/project/test'
    res.redirect(trg)
})




port = 5000
app.listen(port, function(){
    console.log('Koala redirector listening on port:' + port)
});


function getUrl(h, p, m){
	sm = m.startsWith("/") ? m : '/'+m
    return 'http://'+h+':'+p+sm;
    // return 'http://'+h+':'+p;
}
