var os = require('os');

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
    }
};

module.exports = self
