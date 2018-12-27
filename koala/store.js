var request = require('request');
var utils = require('./utils');
var settings = require('./settings');

var self = {
    services: {},
    history:{},
    cache:{},
    registerServices: function(services){
        var resps = {}
        var resp = null
        for(var i in services){
            var service = services[i];
            var sent_from_koala = service.hasOwnProperty('koala')
            if (!service.name.startsWith("koala-")){ //don't register koala itself
              resp = koalaNode.getResponsible(service.name);
              service.responsible = resp;
              this.storeServices([service]);
              if (resp.id != koalaNode.id){
                if(!(resp.id in resps)) resps[resp.id] = {url: resp.url, services:[]}
                resps[resp.id]['services'].push(service)
              }
              if (service.name == 'redis' && !sent_from_koala)
                request.post(settings.syncer_url+'/add_redis',{ json: {'host':settings.koala_host, 'port':service.port} },function (error, response, body) {console.log('Redis registered')});
            }
        }

        for (var key in resps) {
            if (resps.hasOwnProperty(key)) {
                resp = resps[key]
                request.post(utils.getApiUrl(resp.url, 'register_multi'),
                    { json: {services:resp.services, locaiton:koalaNode.me()} },function (error, response, body) {console.log(body)});
            }
        }
    },   

    storeServices: function(servs){ 
        for(var i = 0; i < servs.length; i++){
            service = servs[i]
            if(!service.hasOwnProperty('location'))  //|| (service.hasOwnProperty('transfer') && service.transfer )
                service.location = koalaNode.me(); 
            if(!service.hasOwnProperty('type'))
                service.type = 'service'
            if(service.type == 'object')
                service.url = 'N.A'
            if (!(service.name in this.services))
                this.services[service.name]=[]
            if(!service.hasOwnProperty('url'))
                service.url = 'http://'+service.host + ':' + service.port
            var reg_index = this.isServiceRegistered(service)
            if(reg_index < 0){
                this.services[service.name].push(service)
                if(settings.logObjects && service.type == 'object' && service.location.id == koalaNode.id) 
                    utils.clog(this.getNrLocalObjects())
            }
            else {
                service['transfer'] = false;
                var logobjects = settings.logObjects && service.type == 'object' && service.location.id == koalaNode.id && this.services[service.name][reg_index].location.id != koalaNode.id;
                this.services[service.name][reg_index] = service //update
                if(logobjects) 
                    utils.clog(this.getNrLocalObjects()) //location was updated
            }
        }
    },

    isServiceRegistered: function(service){
        var instances = this.services[service.name]
        if (instances == null) return -1;
        for (var i = 0; i < instances.length; i++) {
            cond = service.hasOwnProperty('transfer') && service.transfer ? 
                   instances[i].url == service.url :
                   instances[i].url == service.url && instances[i].location.id == service.location.id;
            if(cond)
                return i; 
        }
        return -1;
    },
    
    deregisterService: function(service){
    //TODO: don't forget to deregister objects if the service goes down, or even when they are deleted
        sname = service.name
        if (!(sname in this.services)) return false;
        for(i in this.services[sname]){
            if(this.services[sname][i].url == service.url){
                this.services[sname].splice(i,1)
                if(this.services[sname].length == 0)
                    delete this.services[sname]
                return true;    
            }
        }
        return false;
    },

    getServicesForResponsable: function(respid){
        var servs = []
        for (var key in this.services) {
            if (this.services.hasOwnProperty(key)) {
                instances = this.services[key]
                rp = koalaNode.getResponsible(key)
                if(rp.id == respid){
                    for (var i = instances.length - 1; i >= 0; i--) {
                        instances[i].responsible = {id:rp.id, url:rp.url}
                        servs.push(instances[i])
                        if(koalaNode.id != instances[i].location.id)
                            instances.splice(i, 1);
                   
                    }
                    if(this.services[key].length == 0)
                        delete this.services[key]
                }
            }
        }
        
        return servs;
    },

    getNrLocalObjects: function(){
        var nr = 0;
        for (var key in this.services) {
            if (this.services.hasOwnProperty(key)) {
                instances = this.services[key]
                for (var i = instances.length - 1; i >= 0; i--) {
                    local = instances[i].location.id == koalaNode.id
                    if(instances[i].type == 'object' && local)
                        nr++;                   
                }

            }
        }
        return nr;
    },

    clearServices: function(){
        this.services = {}
    },

    getHistoryCount: function(objectId){
        if(objectId in this.history)
            return this.history[objectId].count
        return 0
    },

    clearHistory: function(objectId){
        if(objectId in this.history)
            delete this.history[objectId]
    },

    //returns history entry if object relocation should be triggered 
    logHistory: function(objectId, koalaId){
        if(!objectId ||
           objectId.length == 0 || 
           this.services[objectId][0].type != 'object') return null;
        
        if(!(objectId in this.history))
            this.history[objectId] = {accesses:{}, count:0}
        
        if(!(koalaId in this.history[objectId].accesses))
            this.history[objectId].accesses[koalaId] = 0    


        // if(koalaId == this.history[objectId].source){
        this.history[objectId].accesses[koalaId]++;
        this.history[objectId].count++;
        console.log(objectId +' is accessed ' +this.history[objectId].accesses[koalaId] +
                 ' times from ' + koalaId + ' and ' + this.history[objectId].count + ' times in total' )
        if (this.history[objectId].count == settings.transfer_threshold){
            entry = this.history[objectId] 
            delete this.history[objectId]
            return entry;
        }
        // }
        // else
        //     this.history[objectId] = {source: koalaId, count:0}
        
        return null; 
    }


};

module.exports = self
