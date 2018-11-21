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

redirectAll

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
    var cnt = ''
    cnt += '<input type="text" id="sname" value="dummy" placeholder="Service name">@'
    cnt += '<input type="text" id="surl" value="http://localhost:3000" placeholder="Service url">'
    cnt += '<input type="button" onClick="createService()" value="Create service"><br><br>'
    
    cnt += '<input type="button" onClick="createRandomServices()" value="Generate services">'

    content.innerHTML = cnt
    modal.style.display = "block";
}

function createService(){
    var name = document.getElementById('sname').value;
    var url = document.getElementById('surl').value;
    if(name.length > 0 && url.length > 0)
        httpPostAsync('/api/register', {name:name, url:url}, reload)
    else
        alert('empty stuff is harrrraaam!')
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

