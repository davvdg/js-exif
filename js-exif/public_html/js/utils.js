

define([], function() {
    function HCF(u, v) { 
        var U = u, V = v;
        while (true) {
            if (!(U%=V)) return V;
            if (!(V%=U)) return U;
        } 
    }
    //convert a decimal into a fraction (from http://stackoverflow.com/questions/14783869/convert-a-decimal-number-to-a-fraction-rational-number)
    function fraction(decimal){

        if(!decimal){
            decimal=this;
        }
        var whole = String(decimal).split('.')[0];
        decimal = parseFloat("."+String(decimal).split('.')[1]);
        var num = "1";
        for(var z=0; z<String(decimal).length-2; z++){
            num += "0";
        }
        decimal = decimal*num;
        num = parseInt(num);
        for(var z=2; z<decimal+1; z++){
            if(decimal%z===0 && num%z===0){
                decimal = decimal/z;
                num = num/z;
                z=2;
            }
        }
        //if format of fraction is xx/xxx
        if (decimal.toString().length === 2 && 
                num.toString().length === 3) {
                    //reduce by removing trailing 0's
            decimal = Math.round(Math.round(decimal)/10);
            num = Math.round(Math.round(num)/10);
        }
        //if format of fraction is xx/xx
        else if (decimal.toString().length === 2 && 
                num.toString().length === 2) {
            decimal = Math.round(decimal/10);
            num = Math.round(num/10);
        }
        //get highest common factor to simplify
        var t = HCF(decimal, num);

        //return the fraction after simplifying it
        return ((whole===0)?"" : whole+" ")+decimal/t+"/"+num/t;
    }
    
    function dec2hex(i, l) {
       if (!l) l=2;
       return (i+0x10000).toString(16).substr(-l).toUpperCase();
    }
    
    function dumpHex(dv, start, length) {
        var out = "";
        for (var i =0; i<0+length ; i++) {
            var v = dv.getInt8(start + i);
            //console.log(v);
            //console.log(String.fromCharCode(v));
            //console.log(dec2hex(v));
            out += dec2hex(v); 
        }
        return out;        
    }
    
    function writeHex(dv, offset, hexString) {
        var l = hexString.length;
        for (var i =0; i<0+l/2 ; i++) {
            dv.setUint8(offset + i, parseInt("0x" + hexString.slice(i,i+2)));
        }
    }    

    function _arrayBufferToBase64( buffer ) {
        var binary = '';
        var bytes = new Uint8Array( buffer );
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode( bytes[ i ] );
        }
        return window.btoa( binary );
    }    
    
    decodeString = function(dv, start, length) {
        var out = "";
        for (var i =start; i<start+length ; i++) {
            var v = dv.getInt8(i);
            out += String.fromCharCode(dv.getInt8(i));  
        }
        return out;
    };
    writeString = function(dv, start, stringValue) {
        
        for (var i =0; i<stringValue.length ; i++) {
            dv.setInt8(start + i, stringValue.charCodeAt(i));
        }
        return start + i;
    };
    
    return {
        HCF:HCF,
        fraction:fraction,
        dec2hex:dec2hex,
        dumpHex:dumpHex,
        writeHex:writeHex,
        _arrayBufferToBase64:_arrayBufferToBase64,
        decodeString:decodeString,
        writeString:writeString
        
    };
});