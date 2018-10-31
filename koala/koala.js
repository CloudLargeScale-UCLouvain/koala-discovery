var djb2 = require('djb2');
const urlparser = require('url');
var request = require('request');
var store = require('./store');
var vivaldi = require('./vivaldi')
var utils = require('./utils')

var self = {
    Node: function(url) {
        var mynode = this;
        this.id = self.hash2id(url);
        this.url = url;
        this.rt = {neighbors:[], successors:[], predecessors:[], longlinks:[]}
        this.boot_node = {};
        this.vivaldi = vivaldi.myvivaldi.dynamic;
        this.register = function (){
            request.post(
            { url: boot_url+'/api/get',
             time: true,
             json: this.me()},
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
            this.sendRT(this.boot_node.url)
        }

        this.sendRT = function (url){
            request.post({url:url+'/api/rt', time:true, json: {sender: this.me(), data:[]}},
                function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var rtt = response.timings.connect;
                    rtt -= 1 //remove some additional latency
                    var senderVivaldi = body.sender.vivaldi;
                    mynode.onReceiveRT(body)

                    vivaldi.update(senderVivaldi, rtt);
                    console.log('rtt: ' + rtt)
                }else 
                    console.log(error)
            });
        } 

        this.onReceiveRT = function (body){

            rec_rt = body.sender.rt
            rec_rt.neighbors.push(body.sender)
            // is_sender_neighbor = false
            store.registerServices(body.data)
            newNeigs=[] //new neighs except sender

            for(i in rec_rt.neighbors){
                n = rec_rt.neighbors[i]
                if(n.id == this.id) continue;
                var added = this.addNeighbor(n);
                if(added && n.id != body.sender.id) 
                    newNeigs.push(n)
                //     is_sender_neighbor = true
                // this.rt.neighbors.push(n)
                console.log('Got neighbor: ' + n.id)
            }

            for(i in newNeigs)
                this.sendRT(newNeigs[i].url)

            return store.getServicesForResponsable(body.sender.id)
        }

        this.isNeighbor = function (rn){
            for(i in this.rt.neighbors)
                if(this.rt.neighbors[i].id == rn.id)
                    return true
            return false; 
        }

        this.getNeighborFromURL = function(url){
            var prs = urlparser.parse(utils.addProt(url));
            var host  = prs.hostname; 
            var rport = prs.port;
            for(var i=0; i < this.rt.neighbors.length; i++){
                prs = urlparser.parse(this.rt.neighbors[i].url);
                if(utils.sameHost(prs.hostname, host) && this.rt.neighbors[i].rport == rport)
                    return this.rt.neighbors[i];   
            }
            return null;
        }

        this.addNeighbor = function(n){
            for(i in this.rt.neighbors){
                if(this.rt.neighbors[i].id == n.id){
                    //update
                    this.rt.neighbors[i]['rport'] = n['rport']; 
                    //not sure if you should update all the time (maybe old coords)
                    if(this.rt.neighbors[i].vivaldi.uncertainty > n.vivaldi.uncertainty)
                        this.rt.neighbors[i]['vivaldi'] = n['vivaldi']; 
                    return false;
                }
            }
            this.rt.neighbors.push(n)
            return true;
        }

        //this is kinda fake
        this.getResponsible = function(service){
            hash = self.hash2id(service)
            sid = parseInt(hash.split('-')[0])
            nodes =  this.rt.neighbors.concat([this.me()])
            nodes.sort(function(a,b) {return (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0);})
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
            // console.log('hash for ' + service +' is ' + sid +', resp: ' + ret.id)
            return ret;

        }

        this.getInfo = function(){console.log('ID: ' + this.id);};
        this.me = function(){
            var rtcopy={}
            for (var key in this.rt) {
                if (this.rt.hasOwnProperty(key)) {
                    rtcopy[key]=[]
                    for(i in this.rt[key]){
                        rtcopy[key].push({id:this.rt[key][i].id, url:this.rt[key][i].url, vivaldi:this.rt[key][i].vivaldi })
                    }
                }
            }
            return {id:this.id, url:this.url, rt:rtcopy, vivaldi:this.vivaldi }
        }
        this.meCompact = function(){return this.id+'@'+this.url}

    },
    hash2id: function (str){
        // if (str == 'sharelatex-web-80') return '7-47' //DELETE THIS ATROCITY  
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
        return {id:spl1[0],url:spl1[1]}
    }
    



};

module.exports = self

