var named = require('./node-named/lib');
var os = require('os');
const dns = require('dns-sync');
var server = named.createServer();

ip = '0.0.0.0'
port = 5354
ifaceIp = ''
server.listen(port, ip, function() {
    console.log('DNS server started on port '+ port);

    var ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;
        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) return;
            if (alias >= 1) 
              console.log(ifname + ':' + alias, iface.address);
            else {
              // this interface has only one ipv4 adress
              if(ifname.startsWith('eth'))
                ifaceIp=iface.address
              console.log('Exposing koala on ' + ifaceIp);
            }
            ++alias;
        });
    });

});


server.on('query', function(query) {
  var domain = query.name();
  // var record = new named.SOARecord(domain, {serial: 12345, ttl: 300});
   console.log('a query for ' + domain +'\n')
  var ds = domain.split('.');
  var record = ''
  if(ds.length >= 2 && ds[1] == 'koala' && ds[2] == 'dev'){
    record = new named.ARecord(ifaceIp);
  }else{
    record = new named.ARecord(String(dns.resolve(domain)));
  }
  query.addAnswer(domain, record, 300);
  server.send(query);
  
});
