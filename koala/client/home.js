var modal = document.getElementById('myModal');

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];
var content = document.getElementById("modal-form");

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}


function aclear(){
    httpGetAsync('api/clear', onClear)
}

function onClear(resp){
    document.getElementById('srvs').innerHTML = 'No services registered yet';
}

function redirect(dest){
    // alert(dest)
    httpGetAsync('api/redirect/'+dest, reload)
}

function redirectAll(){
    // alert('aug')
    httpGetAsync('api/redirect_all', reload)
}

function objectLink(objname=''){
    // alert(name)
    var svroptions = '';
    var defsrv = '';
    var firstServiceSet = false;

    var table = document.getElementById("serviceTable");
    if(table != null){
        for (var i = 1, row; row = table.rows[i]; i++) {
            type = table.rows[i].cells[1].innerHTML;
            name = table.rows[i].cells[2].childNodes[0].innerText;
            if(type == 'service'){
                svroptions += '<option value="'+name+'">'+name+'</option>'     
                if(!firstServiceSet){
                    defsrv = name;
                    firstServiceSet = true;
                }
            }
        }
    }

    var cnt = '<input id="object" type="text" value="'+objname+'" placeholder="object" />'
    cnt += '<input id="objectService" type="text" name="service" value="'+defsrv+'" list="serviceList" placeholder="service"/>'
    cnt += '<datalist id="serviceList">'
    cnt += svroptions;
    cnt += '</datalist>'
    cnt += '<br><br><input type="button" onClick="callObject()" value="Call">'
    
    content.innerHTML = cnt
    modal.style.display = "block";
}

function callObject(){
    var obj = document.getElementById("object").value;
    var service = document.getElementById("objectService").value;
    if(service.length > 0){
        var url = 'api/get/'+service
        if(obj.length > 0) url += '/object/'+obj
        // alert('call object ' + obj + ' on service ' + service);
        window.open(url, '_blank');
        modal.style.display = "none";
    }else
        warining()
}

function transfer(name){
    var table = document.getElementById("neighs");
    var neigh = ''
    if(table)
        neigh = table.rows[1].cells[1].innerHTML;

    var dest = prompt("Please enter destination", neigh);

    if (dest.length != 0) {
        var data = {dest:dest, service:{name:name}}
        httpPostAsync('api/ontransfer', data, reload)
    }
}

function ok(data){
    alert(data)
}

function showCreateService(){
    var url = "http://localhost:4000";
    if(document.getElementById("coreIP"))
        url = document.getElementById("coreIP").innerHTML


    var cnt = ''
    cnt += '<input type="text" id="sname" value="dummyService" placeholder="Service name">@'
    cnt += '<input type="text" id="surl" value="http://'+url+':4000" placeholder="Service url">'
    cnt += '<input type="button" onClick="createService()" value="Create service"><br><br>'
    
    cnt += '<input type="text" id="oname" value="dummyObject" placeholder="Object name">'
    cnt += '<input type="button" onClick="createService(true)" value="Create object"><br><br>'
    
    cnt += '<input type="button" onClick="createRandomServices()" value="Generate services">'

    content.innerHTML = cnt
    modal.style.display = "block";
}

function createService(isObject=false){
    var fid = isObject ? 'oname' : 'sname';
    var name = document.getElementById(fid).value;
    var url = document.getElementById('surl').value;
    
    var check = isObject ? name.length > 0 : name.length > 0 && url.length > 0;
    if(check){
        var srv = isObject ? {test:true, type:'object', name:name} : {test:true, name:name, url:url}
        httpPostAsync('/api/register', srv, reload)
    }
    else
        warining()
}

function plotNeighs(){
    var s = JSON.parse(document.getElementById("cords").innerHTML);
    var data = { series: s};

    var options = {
    showLine: false,
    axisX: {
      type: Chartist.AutoScaleAxis,
      onlyInteger: true,
    },
    plugins: [Chartist.plugins.tooltip({
      appendToBody: true
    })]
    }

    new Chartist.Line('.ct-chart', data, options);
}

function warining(){
    alert('Wrong input')
}

function createRandomServices(){
    httpGetAsync('api/generate_services', reload)
}

function reload(){
     location.reload();
}

function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    if(callback != null){
        xmlHttp.onreadystatechange = function() { 
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                callback(xmlHttp.responseText);
        }
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

function httpPostAsync(theUrl, data, callback)
{
    var xmlHttp = new XMLHttpRequest();
    if(callback != null){
        xmlHttp.onreadystatechange = function() { 
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                callback(xmlHttp.responseText);
        }
    }

    xmlHttp.open("POST", theUrl, true); // true for asynchronous 
    xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlHttp.send(JSON.stringify(data));
}

