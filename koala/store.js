var self = {
    services: {},
    registerServices: function(servs){ 
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
                service.url = service.host + ':' + service.port
            var reg_index = this.isServiceRegistered(service)
            if(reg_index < 0)
                this.services[service.name].push(service)
            else    {
                service['transfer'] = false;
                this.services[service.name][reg_index] = service //update
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
        servs = []
        for (var key in this.services) {
            if (this.services.hasOwnProperty(key)) {
                instances = this.services[key]
                rp = koalaNode.getResponsible(key)
                if(rp.id == respid){
                    for (var i = instances.length - 1; i >= 0; i--) {
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

    clearServices: function(){
        this.services = {}
    }



};

module.exports = self
