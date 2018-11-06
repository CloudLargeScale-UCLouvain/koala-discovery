function aclear(){
    httpGetAsync('api/clear', onClear)
}

function onClear(resp){
    document.getElementById('srvs').innerHTML = 'No services registered yet';
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