var http = require("http");

http.createServer(function (request, response) {

   // Send the HTTP header 
   // HTTP Status: 200 : OK
   // Content Type: text/plain
   response.writeHead(200, {'Content-Type': 'text/plain'});
   
   var os = require("os");
   var hostname = os.hostname();
   // Send the response body as "Hello World"
   response.end('I am service 1. I am running on '+ hostname+'\n');

}).listen(3001);

console.log('Server running at http://127.0.0.1:3001/');



