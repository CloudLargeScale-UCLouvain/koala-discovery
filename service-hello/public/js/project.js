function createProject(){
    $.post("project/new", {name:$("#pname").val()}, 
        function( data ) {
            window.location.replace("project/"+$("#pname").val());
        }
    );
}

var interval = ''
var oldValue = ''
function startTimer(){
    interval = setInterval(updateContent, 2000);    
    // $.get("/getProjectContent", {name:$("#pname").val(),}, function( data ) {       
        
    // });
    
}

function updateContent(){
    new_val = $("#pcontent").val()
    if (hashCode(new_val) != hashCode(oldValue)){
        $.post("../updateProjectContent", {name:$("#pname").val(), content:new_val, ts:new Date().getTime()}, function( data ) {});
        oldValue = new_val
    }
}
// alert(window.location.href)

// var interval = 


function hashCode(str) {
    var hash = 0;
    if (str.length == 0) {
        return hash;
    }
    for (var i = 0; i < str.length; i++) {
        char = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}