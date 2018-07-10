var self = {
    services: {},
    registerServices: function(servs){ 
        for(var i = 0; i < servs.length; i++){
            service = servs[i]
            if(!service.hasOwnProperty('koala'))
                service.koala = koalaNode.me()
            if(!service.hasOwnProperty('type'))
                service.type = 'service'
            if (!(service.name in this.services))
                this.services[service.name]=[]
            if(!service.hasOwnProperty('url'))
                service.url = service.host + ':' + service.port
            alreadyRegistered = this.isServiceRegistered(service)
            if(!alreadyRegistered)
                this.services[service.name].push(service)
        }
    },

    isServiceRegistered: function(service){
        instances = this.services[service.name]
        if (instances == null)
            return false;
        for (var i = 0; i < instances.length; i++) {
            if(instances[i].url == service.url && instances[i].koala.id == service.koala.id)
                return true; 
        }
        return false;
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
                        if(koalaNode.id != instances[i].koala.id)
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
