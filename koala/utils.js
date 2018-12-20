var os = require('os');
var request = require('request');
var settings = require('./settings');


var self = {
    getRand:  function(min, max)
    {
        return Math.random() * (max - min) + min
    },
    
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    addProt: function(url){
      return 'http://'+url;
    },

    sameHost: function(host1, host2){
      var h1 = host1 == "localhost" ? "127.0.0.1" : host1;
      var h2 = host2 == "localhost" ? "127.0.0.1" : host2;
      return h1==h2;
    },

    getDefaultURL: function(iface, port){
      var ip  = 'localhost'
      var dport  = 8008

      var ifaces = os.networkInterfaces();
      if (iface != null && iface.length> 0 && iface in ifaces && ifaces[iface].length > 0)
        ip = ifaces[iface][0]['address']
      
      if(port != null && port.length > 0)
        dport = port;

      return 'http://'+ip+':'+dport;
    },

    getApiUrl: function (url, m){
      return url+'/api/'+m;
    },


    // points=[{cords:[x1,y1], weight:0.3},{cords:[x2,y2], weight:0.7}]
    gravityCenter: function(points){
      if(!points || points.length == 0) return null;
      if(points.length == 1) return points[0].cords;

      var res = []
      var dims = points[0].cords.length
      var weightedSum = 0;
      var sumOfWeights = 0;
      for(var i=0; i < dims; i++){
        for(var j=0; j < points.length; j++){
          weightedSum += points[j].cords[i] * points[j].weight;
          sumOfWeights += points[j].weight  
        } 
        res[i] = weightedSum/sumOfWeights;
        weightedSum = 0;
        sumOfWeights = 0;
      }

      return res;
    }, 

    clog: function(msg){
      request.post({ url: settings.boot_url+'/api/log', json: {msg:msg, sender:{id:koalaNode.id, alias:koalaNode.alias }}},
      function (error, response, body) {
        if (!error && response.statusCode == 200) {}
    });
}


};

module.exports = self
