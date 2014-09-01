/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
define(["tagBuilder"], function(tagBuilder) {
    var exifDataTypes = {
        1:{type: "BYTE", func: "getUint8", l:1}, 
        2:{type: "ASCII", func: "getUint8", l:1},
        3:{type: "SHORT", func: "getUint16", l:2},
        4:{type: "LONG", func: "getUint32", l:4},
        5:{type: "RATIONAL", func: "getUint32", l:8},
        7:{type: "UNDEFINED", func: "getUint8", l:1},
        9:{type: "SLONG", func: "getInt32", l:4},
        10:{type: "SRATIONAL", func: "getInt32", l:8},
        }
/*
 1 = BYTE An 8-bit unsigned integer., 
 2 = ASCII An 8-bit byte containing one 7-bit ASCII code. The final byte is terminated with NULL., 
 3 = SHORT A 16-bit (2-byte) unsigned integer, 
 4 = LONG A 32-bit (4-byte) unsigned integer, 
 5 = RATIONAL Two LONGs. The first LONG is the numerator and the second LONG expresses the 
denominator., 
 7 = UNDEFINED An 8-bit byte that can take any value depending on the field definition, 
 9 = SLONG A 32-bit (4-byte) signed integer (2's complement notation), 
10 = SRATIONAL Two SLONGs. The first SLONG is the numerator and the second SLONG is the 
denominator. 
*/
    function dec2hex(i, l) {
       if (!l) l=2;
       return (i+0x10000).toString(16).substr(-l).toUpperCase();
    }
    var tagsLut = tagBuilder;
    console.log(tagsLut);

    var jpegParser = function(dataStream) {
        this.dataStream = dataStream;
        this.parseHeader();
        //this.readTag();
        console.log("parsing header");
        this.tags = {
            "IFD0": [],
            "IFD1":[],
        };
        this.readIDF0();
        this.readIDF1();
    }

    jpegParser.prototype = {
        
        decodeString : function(dv, start, length) {
            var out = "";
            for (var i =start; i<start+length ; i++) {
                var v = dv.getInt8(i);
                //console.log(v);
                //console.log(String.fromCharCode(v));
                //console.log(dec2hex(v));
                out += String.fromCharCode(dv.getInt8(i));  
            }
            return out;
        },
        
        parseHeader : function() {
            var dv = new DataView(this.dataStream, 12, 8);
            var byteOrder = this.decodeString(dv, 0, 2);
            if (byteOrder === "MM") {
                this.le = false;
            } else if (byteOrder === "II") {
                this.le = true;
            } else {
                throw "cannot detect endianess";
            }
            if (dv.getUint16(2,this.le) !== 42) throw "cannot find 42";;
            this.idf0Offset = dv.getUint32(4, this.le) + 12;
        },
        readTag: function(offset, idfOffset, IFD) { //offset from the begining of the file !
            var dv = new DataView(this.dataStream, offset, 12);
            //console.log(this.decodeString(dv, 0, 12));
            var tagId = dv.getUint16(0, this.le);
            var tagType = exifDataTypes[dv.getUint16(2, this.le)];
            var tagCount = dv.getUint32(4, this.le);
            var tagOffset = 0;
            if ((tagType.l * tagCount) <= 4) {
                tagOffset = offset + 8;
            } else {
                tagOffset = dv.getUint32(8, this.le) + idfOffset; //offset from the begining ot the header
            }
            var tag = {type: tagType, count: tagCount, offset: tagOffset, tagId:tagId, tagIdHex: dec2hex(tagId,4)};
            console.log(tagId);
            
            tagsLut.ifds[IFD].tags.forEach(function(item) {
                if (item.idn === tagId) {
                    tag["info"] = item;                    
                }                
            });
            if (!tag["info"]) {
                tagsLut.ifds["-"].tags.forEach(function(item) {
                    if (item.idn === tagId) {
                        tag["info"] = item;                    
                    }                
                });            
            }
            
            this.readTagValue(tag, tagOffset);
            this.tags[IFD].push(tag);
            console.log(tag);
            return tag;
        },
        readTagValue: function(tag, offset) {
            var dv = new DataView(this.dataStream, offset, tag.type.l * tag.count);
            if (tag.type.type !== "UNDEFINED") {
                if (tag.type.type === "ASCII") {
                    tag.value = this.decodeString(dv, 0, tag.count);
                } else {
                    tag.value = dv[tag.type.func](0);
                    if (tag.info.values[tag.value]) {
                        tag.fullValue = tag.info.values[tag.value];
                    }
                }
            }
        },
        readIDF0: function() {
            var i =0;
            var maxi = 15;
            while (i < maxi) {
                var tag = this.readTag(this.idf0Offset +2 + i * 12, 12, "IFD0");
                if ((tag.info.tagName) === "ExifOffset") {
                    this.idf1Offset = tag.value;
                    maxi = i + 2;
                }
                if ((tag.info.tagName) === "GPSInfo") {
                    this.GPSInfo = tag.value;
                }
                i++;
            }
            console.log(this.idf0Offset +2 + i * 12);
        },
        readIDF1: function() {
            console.log(this.idf1Offset);
            var i =0;
            var maxi = 15;
            while (i < maxi) {
                var tag = this.readTag(this.idf1Offset +4 + i * 12, this.idf1Offset, "IFD1");
                i++;
            }
            console.log(this.idf1Offset +4 + i * this.idf1Offset);
        },
        readGPSInfo: function() {
            var i =0;
            var maxi = 15;
            while (i < maxi) {
                var tag = this.readTag(this.GPSInfo +2 + i * 12, 12, "-");
                if ((tag.info.tagName) === "ExifOffset") {
                    this.idf1Offet = tag.value;
                    maxi = i + 2;
                }
                if ((tag.info.tagName) === "GPSInfo") {
                    this.GPSInfo = tag.value;
                }
                i++;
            }
            console.log(this.idf0Offset +2 + i * 12);
        }
    /*
    var dv = new DataView(rawData, 0, 90);
                header.sourceId = dv.getUint16(4);
                header.globalEncoding = dv.getUint16(6); //2
                header.id_guid_data1 = dv.getUint32(8), //4
                header.id_guid_data2 = dv.getUint16(12), //2
                header.id_guid_data3 = dv.getUint16(14), //2
                //header.id_guid_data4  : dv.getUint32(16), //8
                header.versionMajor = dv.getUint8(24), //1
                header.versionMinor = dv.getUint8(25), //1
                header.systemId = ""; //32
                header.generatingSoftware = ""; //32
                return 90;
                */

    
    
    };

    return  jpegParser;
});
