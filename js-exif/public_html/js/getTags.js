/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


requirejs.config({
    baseUrl: 'js/',
    shim : {
    },
    waitSeconds : 0
});

requirejs(["js-exif"], function(t) {


    
    var onload = function(event) {
        var ar = event.target.response;
        console.log(event.target.url);
        console.log(event.target.response.byteLength);
        var j = new t(ar);
        console.log("orig file");
        console.log(j.markers);
        
        ffe0 = j.getMarkersByHex("FFE0");
        j.markers.shift();
        
        ffe1 = j.getMarkersByHex("FFE1");
        if (ffe1.length >0) {
            console.log({}.toString(ffe1));
        } else {
            var a = j.addApp1ExifMarker();
            a.tiffHeader.IFD0.setTagByHex("010f", "iTowns", "ASCII");
        }
        console.log("edited file");        
        console.log(j.markers);

        var f = j.save();
        var p = new t(f);
        console.log("saved reparsed pic");
        console.log(p);
        
        var blob = new Blob([f]);
        var url = window.webkitURL.createObjectURL(blob);
        var bb = "data:application/octet-stream;base64,"
        var pom = document.createElement('a');
        pom.setAttribute('href', url);
        var filename = "reset.jpg";
            
        pom.setAttribute('download', filename);
        pom.click();
        
        
        
    };
    var xhr1 = new XMLHttpRequest();
    xhr1.open("GET", "ressources/IMG_0394.JPG", true);
    xhr1.url = "IMG_0394";
    xhr1.responseType = "arraybuffer";    
    xhr1.addEventListener("load", onload);
    //xhr1.send();    
    var xhr2 = new XMLHttpRequest();
    xhr2.open("GET", "ressources/vosges_xmp.jpg", true);
    xhr2.url = "vosges_xmp";
    xhr2.responseType = "arraybuffer";    
    xhr2.addEventListener("load", onload);
    //xhr2.send();    
    var xhr3 = new XMLHttpRequest();
    xhr3.open("GET", "ressources/iTownsPic_Xlamb93598558.623568116_Ylam936320653.95836461_alt3063.346476212426.jpg", true);
    xhr3.url = "iTownsPix";
    
    xhr3.responseType = "arraybuffer";    
    xhr3.addEventListener("load", onload);
    xhr3.send();    
    
});