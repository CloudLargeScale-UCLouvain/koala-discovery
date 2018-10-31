var self = {
    getRand:  function(min, max)
    {
        return Math.random() * (max - min) + min
    },


    addProt: function(url){
      return 'http://'+url;
    },

    sameHost: function(host1, host2){
      var h1 = host1 == "localhost" ? "127.0.0.1" : host1;
      var h2 = host2 == "localhost" ? "127.0.0.1" : host2;
      return h1==h2;
    }

};

module.exports = self
