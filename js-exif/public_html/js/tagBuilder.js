

define([], function() {
    
    var tags = [];    
    var ifds = {};
    
    var xhr = new XMLHttpRequest();
    
    
    var onLoad = function(event) {
        var xhr = event.currentTarget;
        
        var xml = xhr.response;
        parseDocument(xml);
    }
    
    xhr.addEventListener("load", onLoad);
    xhr.open("GET", "ressources/EXIFTags.html", true );
    xhr.responseType = "document";
    xhr.send();    
    
    var parseDocument = function(xml) {
        
        var xp = "//html/body/blockquote[1]/table/tbody/tr/td/table/tbody/tr[not(@class) or @class!='h']";
        //var xp = "//html/body/blockquote/table/tbody/tr/td/table/tbody/tr";
        var xprowsres = xml.evaluate(xp, xml.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (xprowsres){
            for (var i =0; i<xprowsres.snapshotLength; i++) {
                parseRow(xml, xprowsres.snapshotItem(i));
            }
        }             

    }
    
    var parseRow = function(xml, node) {
        
        var xpTagNames = "td[2]//text()[normalize-space()]";
        var doc = node.ownerDocument;
        var xpTagNamesRes = doc.evaluate(xpTagNames, node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (xpTagNamesRes){
            for ( var i=0 ; i < xpTagNamesRes.snapshotLength; i++ ) {
                //console.log(result.snapshotItem(i).nodeValue);
            }
        }

        var xpIDF = "td[4]//text()[normalize-space()]";        
        var idfres = doc.evaluate(xpIDF, node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (idfres){
            for ( var i=0 ; i < idfres.snapshotLength; i++ ) {
                //console.log(idfres.snapshotItem(i).nodeValue);
            }
        }
        
        if (xpTagNamesRes.snapshotLength !== idfres.snapshotLength) {            
            console.warn("problem", xpTagNamesRes.snapshotLength, idfres.snapshotLength);
            
            console.warn(node);                    
        } else {
            for (var i=0; i< xpTagNamesRes.snapshotLength; i++) {
                
                var ifd = idfres.snapshotItem(i).nodeValue;
                var ifdn;
                if (ifds[ifd]) {
                    ifdn = ifds[ifd];
                } else {
                    ifdn = {ifd: ifd, tags: []};
                    ifds[ifd] = ifdn;
                }
                
                var values = parseValue(node);
                
                var tag = {
                    id: node.childNodes[1].textContent, 
                    idn: parseInt(node.childNodes[1].textContent,16),
                    tagName: xpTagNamesRes.snapshotItem(i).nodeValue,
                    ifd: ifdn,
                    values: values
                };
                ifdn.tags.push(tag);
                //console.log(tag);
            }
        }
    }
    
    var parseValue= function(node) {
        
        var values = {};
        var doc = node.ownerDocument;
        var xpref = "td[5]/a[@href]";        
        var xpres = doc.evaluate(xpref, node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (xpres){
            if (xpres.snapshotLength > 0) {
                
                var key = xpres.snapshotItem(0).getAttribute("href").split("#")[1];
                //console.log(" jump to get attributes ");                
                values = parseExtraValues(node, key);
                
                

            } else {
                var xptable = "td[5]/table[@class='cols']/tbody/tr/td/text()[normalize-space()]";
                var xptableres = doc.evaluate(xptable, node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                if (xptableres.snapshotLength > 0) {
                    //console.log("has table values");
                }
                
                
                for (var i =0; i< xptableres.snapshotLength; i++) {
                    var val = xptableres.snapshotItem(i).nodeValue.split("=");
                    if (val[0] !== undefined && val[1] !== undefined) {
                        values[val[0].trimRight()]=val[1].replace("\n", '').trim();
                    }
                }
                
                var xpvals = "td[5]/span[@class='s']/text()[normalize-space()]";
                var xpvalsres = doc.evaluate(xpvals, node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                if (xpvalsres.snapshotLength > 0) {
                    //console.log("has spanned values");
                }                
                for (var i =0; i< xpvalsres.snapshotLength; i++) {
                    var val = xpvalsres.snapshotItem(i).nodeValue.split("=");
                    if (val[0] !== undefined && val[1] !== undefined) {
                        values[val[0].trimRight()]=val[1].replace("\n", '').trim();
                    }
                }
            }
        }
        return values;
        
    }
    
    var parseExtraValues = function(node, tableName) {
        var doc = node.ownerDocument;
        var values = {};
        var xpExtra = "//html/body/h2[a[@name='"+tableName+"']]/following::table[1]/tbody/tr/td/table/tbody/tr[not(@class) or @class!='h']";
        //var xp = "//html/body/blockquote/table/tbody/tr/td/table/tbody/tr";
        var xpExtraRes = doc.evaluate(xpExtra, doc.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (xpExtraRes){
            for (var i =0; i<xpExtraRes.snapshotLength; i++) {
                var key = xpExtraRes.snapshotItem(i).childNodes[0].textContent.trimRight();
                var val = xpExtraRes.snapshotItem(i).childNodes[1].textContent;
                values[key] = val.replace("= ", '');
            }
        }
        return values;        
    }
    
    return {
        tags:tags,
        ifds:ifds
    };
});