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
            if(instances[i].url == service.url)
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
                for(var i=0; i < instances.length; i++){
                    rn = instances[i].type == 'service' ? instances[i].name : instances[i].sname
                    rp = koalaNode.getResponsible(rn)
                    if(rp.id == respid)
                        servs.push(instances[i])
                }
            }
        }
        return servs;
    }



};

module.exports = self
