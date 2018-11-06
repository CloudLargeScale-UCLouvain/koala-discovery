var djb2 = require('djb2');
const urlparser = require('url');
var request = require('request');
var store = require('./store');
var vivaldi = require('./vivaldi')
var utils = require('./utils')
var settings = require('./settings')

var self = {
    Node: function(url) {
        var mynode = this;
        this.id = self.hash2id(url);
        this.url = url;
        this.rt = {neighbors:[], successors:[], predecessors:[], longlinks:[]}
        this.boot_node = {};
        this.core = {};
        this.vivaldi = vivaldi.myvivaldi.dynamic;
        this.rPort = 0;
        this.register = function (){
            request.post(
            { url: settings.boot_url+'/api/get', json: this.me()},
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var boot = body.boot;
                    if(boot.id == mynode.id){
                        console.log('Node ' + mynode.id + ' is the first one to join (a.k.a Adam)');
                    }else{
                        mynode.boot_node = boot;
                        mynode.core = body.core;
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
            var that = this;
            request.post({url:url+'/api/rt', json: {source: this.me(true), data:[]}},
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        // var rtt = response.timings.connect;
                        // rtt -= 1 //remove some additional latency
                        that.rPort = response.client.localPort;
                        // var sourceVivaldi = body.source.vivaldi;
                        body.source['rPort'] = response.client.remotePort;
                        mynode.onReceiveRT(body)

                        // vivaldi.update(sourceVivaldi, rtt);
                        // console.log('rtt: ' + rtt)
                    }else 
                        console.log(error)
                });
        } 

        this.onReceiveRT = function (body){

            rec_rt = body.source.rt
            rec_rt.neighbors.push(body.source)
            // is_source_neighbor = false
            store.registerServices(body.data)
            newNeigs=[] //new neighs except source

            for(i in rec_rt.neighbors){
                n = rec_rt.neighbors[i]
                if(n.id == this.id) continue;
                var added = this.addNeighbor(n);
                if(added && n.id != body.source.id) 
                    newNeigs.push(n)
                //     is_source_neighbor = true
                // this.rt.neighbors.push(n)
                console.log('Got neighbor: ' + n.id)
            }

            for(i in newNeigs)
                this.sendRT(newNeigs[i].url)

            return store.getServicesForResponsable(body.source.id)
        }

      
        this.getNeighborFromURL = function(url, useRemotePort){
            var prs = urlparser.parse(url);
            var host  = prs.hostname; 
            var port = prs.port;
            var samePort = false;
            for(var i=0; i < this.rt.neighbors.length; i++){
                prs = urlparser.parse(this.rt.neighbors[i].url);
                samePort = useRemotePort ? this.rt.neighbors[i].rPort == port : prs.port == port;
                if(utils.sameHost(prs.hostname, host) && samePort)
                    return this.rt.neighbors[i];   
            }
            return null;
        }

        this.getNeighborFromID = function(id){
            for(var i=0; i < this.rt.neighbors.length; i++)
                if(this.rt.neighbors[i].id == id)
                    return this.rt.neighbors[i];   
            
            return null;
        }

        this.addNeighbor = function(n){
            for(i in this.rt.neighbors){
                if(this.rt.neighbors[i].id == n.id){
                    //update
                    this.rt.neighbors[i]['rPort'] = n['rPort']; 
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
            min = settings.nr_dc 
            ret = {}
            for(i in nodes){
                nid = parseInt(nodes[i].id.split('-')[0])
                dist = Math.min(Math.abs(sid-nid), settings.nr_dc - Math.abs(sid-nid)) 
                if(dist < min){
                    min = dist
                    ret = nodes[i]
                }
            }
            // console.log('hash for ' + service +' is ' + sid +', resp: ' + ret.id)
            return ret;

        }

        this.getInfo = function(){console.log('ID: ' + this.id);};
        this.me = function(extended = false){
            var rtcopy={}
            if(extended){
                for (var key in this.rt) {
                    if (this.rt.hasOwnProperty(key)) {
                        rtcopy[key]=[]
                        for(i in this.rt[key]){
                            rtcopy[key].push({id:this.rt[key][i].id, url:this.rt[key][i].url, vivaldi:this.rt[key][i].vivaldi })
                        }
                    }
                }
            }
            return {id:this.id, url:this.url, rt:rtcopy, core:settings.isCore, vivaldi:this.vivaldi }
        }
        this.meCompact = function(){return this.id+'@'+this.url}

    },
    hash2id: function (str){
        // if (str == 'sharelatex-web-80') return '7-47' //DELETE THIS ATROCITY  
        return self.hash(str,settings.nr_dc) + 
        '-' + 
        self.hash(str,settings.nr_nodes_x_dc)
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

