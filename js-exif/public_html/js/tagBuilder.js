

define([], function() {
    
    var tags = [];    
    var ifds = {};
    
    var xhr = new XMLHttpRequest();
    
    
    var onLoad = function(event) {
        var xhr = event.currentTarget;
        
        var xml = xhr.response;
        parseDocument(xml);
    }
    
    var otherRequest = 0;
    
    var parsedPage = {};
    
    var mainPage = "EXIF.html";
    xhr.addEventListener("load", onLoad);
    xhr.open("GET", "ressources/"+mainPage, true );
    xhr.responseType = "document";
    xhr.send();    
    
    var parseDocument = function(xml) {
        
        var xph = "//html/body/blockquote[1]/table/tbody/tr/td/table/tbody/tr[@class='h']/th";
        var xphres = xml.evaluate(xph, xml.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        console.log(xphres);
        var vcol = 4;
        if (xphres){
            for (var i =0; i<xphres.snapshotLength; i++) {
                if (xphres.snapshotItem(i).textContent === "Values / Notes") {
                    vcol = i;
                }
            }
        }            
        
        var xp = "//html/body/blockquote[1]/table/tbody/tr/td/table/tbody/tr[not(@class) or @class!='h']";
        //var xp = "//html/body/blockquote/table/tbody/tr/td/table/tbody/tr";
        var xprowsres = xml.evaluate(xp, xml.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (xprowsres){
            for (var i =0; i<xprowsres.snapshotLength; i++) {
                parseRow(xml, xprowsres.snapshotItem(i), vcol);
            }
        }             
    }
    
    var parseRow = function(xml, node, vCol) {
        
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
                
                var values = parseValue(node, vCol);
                
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

    var parseRowSimple = function(nodei, vCol, ifd) {
        //console.log(nodei);
        var xpTagNames = "td[2]//text()[normalize-space()]";
        var doc = nodei.ownerDocument;
        //console.log(doc);
        var xpTagNamesRes = doc.evaluate(xpTagNames, nodei, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        var ifdn;
        if (ifds[ifd]) {
            ifdn = ifds[ifd];
        } else {
            ifdn = {ifd: ifd, tags: []};
            ifds[ifd] = ifdn;
        }

        var values = parseValue(nodei, vCol);

        var tag = {
            id: nodei.childNodes[1].textContent, 
            idn: parseInt(nodei.childNodes[1].textContent,16),
            tagName: xpTagNamesRes.snapshotItem(0).nodeValue,
            ifd: ifdn,
            values: values
        };
        ifdn.tags.push(tag);
    };
    
    
    
    var parseValue= function(node, vCol) {
        
        var values = {};
        var doc = node.ownerDocument;
        var xpref = "td["+(vCol+1)+"]/a[@href]";        
        var xpres = doc.evaluate(xpref, node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (xpres){
            if (xpres.snapshotLength > 0) {
                //console.log("extra values");
                var splitURL = xpres.snapshotItem(0).getAttribute("href").split("#");
                var key = splitURL[1];
                var page = splitURL[0].split("/").splice(-1)[0];
                console.log(page);
                if (page === mainPage) {
                    values = parseExtraValues(node, key);
                } else {
                    
                    var pageL = page.split("/");
                    var cpage = pageL[pageL.length-1];
                    if (!parsedPage[cpage]) {
                        console.log(cpage);
                        
                        parsedPage[cpage]= true;
                        var bim = new XMLHttpRequest();
                        bim.open("GET", "ressources/"+cpage, true );
                        bim.addEventListener("load", onLoadExtra);
                        bim.addEventListener("error", onErrorExtra);                        
                        bim.responseType = "document";
                        otherRequest += 1;
                        bim.send();
                    }
    
                }
                
                

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
                        val[0] = parseInt(val[0] );
                        values[val[0]]=val[1].replace("\n", '').trim();
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
        if (xpExtraRes) {
            for (var i =0; i<xpExtraRes.snapshotLength; i++) {
                var re = new RegExp("0x[0-9A-Fa-f]*");
                var key = xpExtraRes.snapshotItem(i).childNodes[0].textContent.trimRight();
                if (key.match(re)!==null) {
                    key = parseInt(key);
                                    console.log(key);

                }
                
                var val = xpExtraRes.snapshotItem(i).childNodes[1].textContent;
                values[key] = val.replace("= ", '');
            }
        }
        return values;        
    }
    var onErrorExtra = function(event) {
        
        otherRequest -=1;
        //console.log(otherRequest);

        checkDoc();
    }
    var onLoadExtra = function(event) {
        var pagL = event.currentTarget.response.URL.split("/");
        otherRequest -=1;
        if (pagL.slice(-1)[0] === "GPS.html") {
            
            var target = event.currentTarget;
            //console.log(event);

            var xml2 = target.response;
            parseExtraDocs(xml2, "GPS");
            checkDoc();
        }
        
    }
    var checkDoc = function() {
        if (otherRequest === 0) {
            //console.log(ifds);
        }
    }
    var parseExtraDocs = function(xmli, ifd) {
        var doc = xmli;
        var values = {};
        var xp = "//html/body/blockquote[1]/table/tbody/tr/td/table/tbody/tr[not(@class) or @class!='h']";
        //var xp = "//html/body/blockquote/table/tbody/tr/td/table/tbody/tr";
        var xprowsres = xmli.evaluate(xp, xmli.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (xprowsres) {
            for (var i = 0; i < xprowsres.snapshotLength; i++) {
                //console.log(xprowsres.snapshotItem(i));
                parseRowSimple(xprowsres.snapshotItem(i), 3, ifd);
            }
        }
    }
    
    
    
    
    return {
        tags:tags,
        ifds:ifds
    };
});