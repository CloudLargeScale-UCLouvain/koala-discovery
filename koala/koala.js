var djb2 = require('djb2')
var request = require('request');
var self = {
    Node: function(host, port) {
        var mynode = this;
        this.id = self.hash2id(host);
        this.host = host;
        this.port = port;
        this.rt = {neighbors:[], successors:[], predecessors:[], longlinks:[]}
        this.boot_node = {};
        this.register = function (){
            request.post(
            boot_url+'/api/get',
            { json: this.me() },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    if(body.id == mynode.id){
                        console.log('Node ' + mynode.id + ' is the first one to join (a.k.a Adam)');
                    }else{
                        mynode.boot_node = body;
                        mynode.join();
                    }
                }else
                    console.log(error)
            }
            );
        };

        this.join = function (){
            console.log('Node ' + this.id +' joining using ' + this.boot_node.id);
            this.rt.neighbors.push(this.boot_node)
            this.sendRT()
        }

        this.sendRT = function (){
            request.post('http://'+this.boot_node.host+':'+this.boot_node.port+'/api/rt', { json: {sender: this.me(), rt:this.rt} },
                function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    mynode.onReceiveRT(body)
                }else 
                    console.log(error)
            });
        } 

        this.onReceiveRT = function (body){
            rec_rt = body.rt
            rec_rt.neighbors.push(body.sender)
            for(i in rec_rt.neighbors){
                n = rec_rt.neighbors[i]
                if(n.id == this.id || this.isNeighbor(n)) continue;
                this.rt.neighbors.push(n)
                console.log('Got neighbor: ' + n.id)
            }
        }

        this.isNeighbor = function (rn){
            for(i in this.rt.neighbors)
                if(this.rt.neighbors[i].id == rn.id)
                    return true
            return false; 
        }

        //this is kinda fake
        this.getResponsible = function(service){
            hash = self.hash2id(service)
            sid = parseInt(hash.split('-')[0])
            nodes =  this.rt.neighbors.concat([this.me()])
            min = nr_dc 
            ret = {}
            for(i in nodes){
                nid = parseInt(nodes[i].id.split('-')[0])
                dist = Math.min(Math.abs(sid-nid), nr_dc - Math.abs(sid-nid)) 
                if(dist < min){
                    min = dist
                    ret = nodes[i]
                }
            }
            return ret;

        }

        this.getInfo = function(){console.log('ID: ' + this.id);};
        this.me = function(){return {id:this.id, host:this.host, port:this.port}}
        this.meCompact = function(){return this.id+'@'+this.host+":"+this.port}

    },
    hash2id: function (str){
        return self.hash(str,nr_dc) + 
        '-' + 
        self.hash(str,nr_nodes_x_dc)
    },
    hash: function(str, rem){
        res = djb2(str) & ~(1<<31)
        return res % rem
    },
    convertCompact2Obj: function(comp){
        spl1 = comp.split('@')
        spl2 = spl1[1].split(':')
        return {id:spl1[0],host:spl2[0],port:spl2[1]}
    }

};

module.exports = self

