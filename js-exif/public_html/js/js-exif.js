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
    
    function dumpHex(dv, length) {
        var out = "";
        for (var i =0; i<0+length ; i++) {
            var v = dv.getInt8(i);
            //console.log(v);
            //console.log(String.fromCharCode(v));
            //console.log(dec2hex(v));
            out += dec2hex(v); 
        }
        return out;        
    }
    
    decodeString = function(dv, start, length) {
        var out = "";
        for (var i =start; i<start+length ; i++) {
            var v = dv.getInt8(i);
            //console.log(v);
            //console.log(String.fromCharCode(v));
            //console.log(dec2hex(v));
            out += String.fromCharCode(dv.getInt8(i));  
        }
        return out;
    };
    
    var tagsLut = tagBuilder;
    console.log(tagsLut);


    var Idf = function() {
        this.tags = [];
        this.name = "IFD0";
    };
    
    Idf.prototype = {
      getTagByName : function(tagName) {
          for (var i=0; i < this.tags.length; i++) {
              if (this.tags[i].tagDesc === tagName) {
                  return this.tags[i];
              }
          }
          return undefined;
      },
      serialize: function(dataStream, offset) {
          var interopSize = 2;
          var payloadSize = this.computePayloadSize();
          var tagSize = this.tags.length * 12;
          var nextOffsetSize = 2;
          var dv = new DataView(dataStream, offset, payloadSize + tagSize + nextOffsetSize + interopSize);
          this._wTagCount(dv);
          var i;
          for (i=0; i<this.tags.length; i++) {
              this.tags[i].writeTagInterop(dv, i*12 +interopSize);
          }
          this._wNextIFDOffset(dv, (i+1)*12 +interopSize);
          var payloadStart = (i+1)*12 +interopSize + nextOffsetSize;
          for (i=0; i<this.tags.length; i++) {
              var plsize  = this.tags[i].writePayload(dv, payloadStart);
              payloadStart += plsize;
          }          
          
      },
      deserialize: function(dataStream, offsetFromTiffHeader, offsetFromSOI) { // offset from begining of the file... need to get the offset from tiff header
          //console.log(offsetFromSOI);
          var offset = offsetFromSOI;
          var interopSize = 2; 
          var dv = new DataView(dataStream, offset, interopSize);
          //console.log(dumpHex(dv,2));
          var tagCount = this._rTagCount(dv);
          //console.log(tagCount);
          var nextIFDOffsetSize = 2;
          var dv = new DataView(dataStream, offset+interopSize, tagCount * 12 + nextIFDOffsetSize);
          var plSize = 0;
          var i;          
          for (i = 0; i< tagCount; i++) {
              var tag = new Tag();
              tag.container = this;
              tag.deserializeInterop(dv, i * 12);
              plSize += tag.getPayloadSize();
              this.tags.push(tag);
          }
          this.nextIFDOffset = dv.getUint16(tagCount *12);
          var dv = new DataView(dataStream, offset+ interopSize + nextIFDOffsetSize + tagCount *12, plSize);
          //console.log(plSize);
          //console.log(offset+ interopSize + nextIFDOffsetSize + tagCount *12          );
          var plOffset = -(offsetFromTiffHeader + interopSize + nextIFDOffsetSize + tagCount *12);
          for (i = 0; i< tagCount; i++) {
              this.tags[i].deserializePayload(dv, plOffset + this.tags[i].payloadOffset); // offset to start of tiff header -> offset + 
              if (this.tags[i].payloadOffset>0) {
                //console.log(this.tags[i].payloadOffset + offsetFromTiffHeader, this.tags[i].plSize);

            }
          }
          this.endOffset = offset+ interopSize + nextIFDOffsetSize + tagCount *12 + plSize - 25;
          //console.log(this.endOffset);
      },
      _rTagCount: function(dv) {
          var tagCount = dv.getUint16(0);
          return tagCount;
      },
      _wTagCount: function(dv) {
          dv.setUint16(0, this.tags.length);
      },
      computePayloadSize: function() {
          var plSize = 0;
          for (var i=0; i<this.tags.length; i++) {
              plSize += this.tags[i].getPayloadSize();
          }
          return plSize;
      },
      computeNextIFDOffset: function() {
          // nextIFDOffset = offset + ifd0 size full + Exififd size full
      }
    };

    var Tag = function() {
        this.le = false;
        this.rawvalue;
        this.fullDeserialized = false
    };
    Tag.prototype= {
        writeTagInterop: function(dv, dvOffset) {
            
        },
        writePayload: function(dv, payloadStart) {
            
        },
        computePayloadSize: function() {
            var plSize = 0;
            if (this.type ==="ASCII") {
                plSize = this.rawvalue.length;
            } else {
                plSize = this.tagCount * this.tagSize;
            }
            return plSize;
        },
        getPayloadSize: function() {
            if (this.fullDeserialized) {
                return this.computePayloadSize();
            } else {
                var plSize = this.tagCount * this.tagSize;
                if (plSize > 4) {
                    this.plSize = plSize;
                    return this.plSize;
                }
                this.plSize = 0;
                return this.plSize;
            }
        },
        deserializeInterop: function(dv, dvOffset) {
            this.tagId =    dv.getUint16(dvOffset, this.le);
            // lookup tags in dictionary
            //console.log(this.tagId);
            var self = this;
            tagsLut.ifds[this.container.name].tags.forEach(function(item) {
                if (item.idn === self.tagId) {
                    //console.log("found ");
                    self["info"] = item;
                    self["tagDesc"] = item.tagName;
                }
            });
            if (!this["info"]) {
                tagsLut.ifds["-"].tags.forEach(function(item) {
                    if (item.idn === self.tagId) {
                        self["info"] = item;
                        self["tagDesc"] = item.tagName;
                    }
                });
            }
            //console.log(this);
            //
            this.tagType =  exifDataTypes[dv.getUint16(dvOffset + 2, this.le)];
            this.tagSize =  this.tagType.l;
            this.tagCount = dv.getUint32(dvOffset + 4, this.le);
            var plSize = this.getPayloadSize();
            if (plSize === 0) {
                this.payloadOffset = -1;
                this.deserializePayload(dv,dvOffset + 8);
            } else {
                this.payloadOffset = dv.getUint32(dvOffset + 8, this.le);
                
            }
            
        },
        deserializePayload: function(payloadDV, payloadOffset) {
            if (!this.fullDeserialized) {
                if (this.tagType.type !== "UNDEFINED") {
                    if (this.tagType.type === "ASCII") {
                        this.rawValue = decodeString(payloadDV, payloadOffset, this.tagCount);
                    } else if (this.tagType.type === "RATIONAL" || this.tagType.type === "SRATIONAL") { 
                        var value = [];
                        for (var i = 0; i< this.tagCount; i++) {
                            var num = this.value = payloadDV[this.tagType.func](payloadOffset + i*this.tagType.l + 0, this.le);
                            var den = this.value = payloadDV[this.tagType.func](payloadOffset + i*this.tagType.l + 4, this.le);
                            value.push(num/den);
                        }
                        this.value = value;
                    } else {
                        
                        this.value = payloadDV[this.tagType.func](payloadOffset, this.le);
                        if (this.info.values[this.value]) {
                            this.rawValue = this.info.values[this.value];
                        }
                        
                    }
                }
                this.fullDeserialized = true;
            }            
        }
    };












    var jpegParser = function(dataStream) {
        this.dataStream = dataStream;
        this.parseTiffHeader();
        //this.readTag();
        console.log("parsing header");
        this.tags = {
            "IFD0": [],
            "IFD1":[],
        };
        var idf0p = new Idf();
        idf0p.deserialize(dataStream, this.idf0Offset, this.idf0Offset +12);

        console.log(idf0p);
        
        
        var ExifIFDoffset = idf0p.getTagByName("ExifOffset");
        if (ExifIFDoffset !== undefined) {
            var Exifidf0p = new Idf();
            Exifidf0p.name = "ExifIFD";
            Exifidf0p.deserialize(dataStream, ExifIFDoffset.value, ExifIFDoffset.value+12);
            console.log(Exifidf0p);
        }
        if (idf0p.nextIFDOffset !== 0) {
            var idf1p = new Idf();
            idf1p.name = "IFD1";
            idf1p.deserialize(dataStream, idf0p.nextIFDOffset, idf0p.nextIFDOffset +12);
            console.log(idf1p);
        }
        var GPSoffset = idf0p.getTagByName("GPSInfo");
        if (GPSoffset !== undefined) {
            var GPSp = new Idf();
            GPSp.name = "GPS";
            GPSp.deserialize(dataStream, GPSoffset.value, GPSoffset.value +12);
            console.log(GPSp);
        }        

    };

    jpegParser.prototype = {
        
        
        
        
        parseTiffHeader : function() {
            var dv = new DataView(this.dataStream, 12, 8); // start of tiff header. not start of file !
            var byteOrder = decodeString(dv, 0, 2);
            if (byteOrder === "MM") {
                this.le = false;
            } else if (byteOrder === "II") {
                this.le = true;
            } else {
                throw "cannot detect endianess";
            }
            if (dv.getUint16(2,this.le) !== 42) throw "cannot find 42";;
            this.idf0Offset = dv.getUint32(4, this.le); // start idf0 + start tiff header
        },
        
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
