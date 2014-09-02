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
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "ressources/vosges_xmp.jpg", true);
    xhr.responseType = "arraybuffer";

    
    var onload = function(event) {
        var ar = event.target.response;
        console.log(event.target.response.byteLength);
        var j = new t(ar);
    };
    
    xhr.addEventListener("load", onload);
    xhr.send();    
});