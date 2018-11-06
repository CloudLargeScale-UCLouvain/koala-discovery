var self = {
  myvivaldi : {dynamic:{cords:[0,0,0], uncertainty:1000}, static:{uncertainty_factor:0.25, correction_factor:0.25}},

  // piggybackVivaldi: function(json){
  //   json['vivaldi'] = self.myvivaldi.dynamic;
  //   return json;
  // },

  cordsToString: function(cords){
      var s = '[';
      for(var i=0; i < cords.length; i++){
        s += cords[i].toFixed(3);
        if (i != cords.length -1) s += ', ';
      }
      s+=']';
      return s;
  },

  update: function(remote_vivaldi, rtt){
    var local_cords = self.myvivaldi.dynamic.cords;
    var local_uncertainty = self.myvivaldi.dynamic.uncertainty;
    var remote_cords = remote_vivaldi.cords;
    var remote_uncertainty = remote_vivaldi.uncertainty;
    
    var estimate = self.euclidean_dist(local_cords, remote_cords);
    var err = estimate - rtt;
    // console.log('error: %s', err)
    var rel_error = Math.abs(err)/rtt;
    var balance_uncertainty = local_uncertainty / (local_uncertainty + remote_uncertainty);


    self.myvivaldi.dynamic.uncertainty = rel_error * self.myvivaldi.static.uncertainty_factor * balance_uncertainty
          + self.myvivaldi.dynamic.uncertainty * (1 - self.myvivaldi.static.uncertainty_factor * balance_uncertainty);

    // console.log('rtt: %s, error: %s, uncertainty: %s', rtt,err,self.myvivaldi.dynamic.uncertainty)
    // console.log(rtt-100)

    var sensitivity = self.myvivaldi.static.correction_factor * balance_uncertainty;
    var force_vect = self.force_vector(local_cords, remote_cords, err)
    
    for(var i = 0; i < self.myvivaldi.dynamic.cords.length; i++)
      self.myvivaldi.dynamic.cords[i] += force_vect[i] * sensitivity;
  },


  euclidean_dist: function(cord1, cord2){
    var sum = 0;
    for(var i = 0; i < cord1.length; i++)
      sum += Math.pow(cord2[i] - cord1[i], 2)
    return Math.sqrt(sum)
  },

  force_vector: function(cord1, cord2, err){
    var force_vect = []
    var zero_vect = []
    var equal = true
    for(var i = 0; i < cord1.length; i++){
      force_vect[i] = cord2[i] - cord1[i]; //compute difference
      zero_vect[i] = 0;
      if(force_vect[i] != 0)
        equal = false
    }

    while(equal){ //generate random vector 
      for(var i = 0; i < force_vect.length; i++){
        force_vect[i] =  Math.random()*2-1;
        if (force_vect[i] != 0) 
          equal = false;
      }
    }

    var length = self.euclidean_dist(zero_vect, force_vect);
    for(var i = 0; i < force_vect.length; i++){
        force_vect[i] = force_vect[i]/length; //normalize
        force_vect[i] *= err; //apply error
    }
    return force_vect;
  }

};

module.exports = self