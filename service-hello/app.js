const express = require('express')
const bodyParser   = require('body-parser')
var redis = require('redis');


const app = express()
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(express.static('public'))

var MongoClient = require('mongodb').MongoClient;
mongourl = process.env.MONGO_URL ?  process.env.MONGO_URL : "mongodb://192.168.56.1:27017/";
mongodb = 'fakelatex'

//TODO: think how this can be discovered (there is no http here, koala won't work in this case)
redishost = process.env.REDIS_HOST ? process.env.REDIS_HOST : '172.17.0.1'
var ReidsClient = redis.createClient(6379, redishost);

ReidsClient.on("error", function(err) {
    console.error("Error connecting to redis");
    ReidsClient.quit()
});

app.get('/projects', function (req, res) {
    projects = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>'
    projects += '<script src="js/project.js"></script>'
    // projects = 'Create a new project <br> <form action="project/new" method="post">Project name:  <input type="submit" value="Submit"></form> '
    projects += 'Create a new project <br> <input id="pname" type="text" name="name" value="" placeholder="Project name"> <input type="button" value="New project" onclick="createProject()"><br><br>'
    no_proj = true
    MongoClient.connect(mongourl+mongodb, function(err, db) {
      var dbo = db.db(mongodb);  
      var collection = dbo.collection('projects')
      cursor = collection.find()
      cursor.each(function(err, item) {
    
        if(item == null) {
          db.close(); // you may not want to close the DB if you have more code....
          if(no_proj) 
            projects += 'No projects yet. Create one above!'
          res.send(projects + '\n')
          return;
        }
        no_proj = false
        projects += '<a href="project/'+item.name+'">'+item.name+'</a><br>'
      });
      db.close();
      // console.log('asdf')
    });


    
    
})

app.post('/project/new', function (req, res) {
    pname = req.body.name

    MongoClient.connect(mongourl+mongodb, function(err, db) {
      var dbo = db.db(mongodb);  
      var myobj = { name: pname}; 
      var collection = dbo.collection('projects')
      collection.insertOne(myobj, function(err, r) {
        if (err) throw err;
        res.send('Project ' + pname + ' created!')
        // console.log("1 document inserted");
        db.close();
      });  
    });
})


app.post('/updateProjectContent', function (req, res) {
    pname = req.body.name
    pcontent = req.body.content

    ReidsClient.set(pname, pcontent, function(err, reply) {
      res.send('project stored')
    });
})


app.post('/project/test', function (req, res) {
    res.send('post test')
})

app.get('/project/test', function (req, res) {
    res.send('get test')
})


// app.get('/getProjectContent', function (req, res) {
//     pname = req.params.name
//     pcontent = req.body.content
//     //get this shit from redis
//     res.send('project content')
    
// })

function getProjectContent(pname){
  //connect to redis

  return 'this is the project content for ' + pname

}

app.get('/project/:project', function (req, res) {
    pname = req.params.project
    ReidsClient.get(pname, function(err, reply) {
      // console.log(reply);
      pcontent = reply ? reply : ''
      content = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>'
      content += '<script src="../js/project.js"></script>'
      content += 'This is ' + pname + '<input id="pname" type="text" value="'+pname+'" style="display:none"/><br><br>'
      content += '<textarea id="pcontent" rows="20" cols="100">'+pcontent+'</textarea><br><br>'
      content += '<script type="text/javascript">startTimer()</script>'
      content += 'Go back to <a href="../projects"> projects</a>'
      res.send(content)
    });



    
})


app.get('/*', function (req, res) {
    res.send('<h1>Welcome to Fakelatex!</h1> <br> Check out your <a href="projects">projects</a>')
})


port = 3000
app.listen(port, () => console.log('Hello service listening on port:' + port))

