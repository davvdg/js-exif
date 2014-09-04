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
    
    var tagsLut = tagBuilder;
    console.log(tagsLut);
    var Marker = function() {
        
    };
    Marker.prototype = {
        deserialize: function(dataStream, offset) {
            var dv = new DataView(dataStream, offset, 4);
            this.deserializeDS = dataStream;
            this.markerStart = offset;
            this.markerType = dv.getUint16(0);
            this.markerTypeHex = dumpHex(dv, 2);
            this.markerSize = dv.getUint16(2);
            this.markerEnd = offset + 2 + this.markerSize;
            console.log(this);
            
        },
        computeMarkerSize: function() {
            return this.markerSize;
        },
        serialize: function(dataStream, offset) {
            var size = this.computeMarkerSize();
            var dvOut = new DataView(dataStream, offset, 2 + size);
            var dvIn = new DataView(this.deserializeDS, this.markerStart, 2 + size);
            for (var i=0; i < size +2 ; i++) {
                var v = dvIn.getUint8(i);
                dvOut.setUint8(i, v);                
            }            
        }
    };

    var TiffHeader = function() {
        this.ifds = [];
    };
    TiffHeader.prototype = {
        deserialize: function(dataStream, offset) { // this offset is the start off the tiff header from the start of the file
            var dv = new DataView(dataStream, offset, 8); // 2 + 2 + 4
            var byteOrder = decodeString(dv, 0, 2);
            if (byteOrder === "MM") {
                this.le = false;
            } else if (byteOrder === "II") {
                this.le = true;
            } else {
                throw "cannot detect endianess";
            }
            if (dv.getUint16(2,this.le) !== 42) throw "cannot find 42";
            this.idf0OffsetFromTiffH = dv.getUint32(4, this.le); // start idf0 + start tiff header
            this.IFD0 = new Ifd();
            this.IFD0.deserialize(dataStream, this.idf0OffsetFromTiffH, offset + this.idf0OffsetFromTiffH);
            var ExifIFDoffset = this.ifd0.getTagByName("ExifOffset");
            if (ExifIFDoffset !== undefined) {
                this.exifIFD = new Ifd();
                this.exifIFD.name = "ExifIFD";
                this.exifIFD.deserialize(dataStream, ExifIFDoffset.value, ExifIFDoffset.value + offset);
                console.log(this.exifIFD);
            }
            if (this.IFD0.nextIFDOffset !== 0) {
                this.IFD1 = new Ifd();
                this.IFD1.name = "IFD1";
                this.IFD1.deserialize(dataStream, this.IFD0.nextIFDOffset, this.IFD0.nextIFDOffset + offset);
                console.log(this.IFD1);
            }
            var GPSoffset = this.IFD0.getTagByName("GPSInfo");
            if (GPSoffset !== undefined) {
                this.GPS = new Ifd();
                this.GPS.name = "GPS";
                this.GPS.deserialize(dataStream, GPSoffset.value, GPSoffset.value + offset);
                console.log(GPSp);
            }
        },
        computeSize: function() {
            var size = 8;
            if (this.GPS) {
                this.GPSSize = this.GPS.computeSize();
                this.IFD0.setTagHex("8825", 0);
                size += this.GPSSize;
            }
            if (this.IFD1) {
                this.IFD1Size = this.IFD1.computeSize();
                size += this.IFD1Size;
            }
            this.IFD0Size = this.IFD0.computeSize();
            this.exifIFDSize = this.exifIFD.computeSize();
            size += (this.IFD0Size + this.exifIFDSize);
            return size;
        },
        serialize: function(dataStream, offset) {
            // first check if we have an ifd or GPS
            // if GPS, compute it's size.
            // if IFD1, compute it's size.
            // Compute ExifIFD size
            // if GPS, add GPS tag to IFD0
            // Compute IFD0 size
            // 
            // 
            // let's decide an order. Say, IFD0, EXIFIFD, GPS first, IFD1
            // compute EXIFIFD offset
            // compute GPS Offset
            // compute IFD1 Offset
            // write EXIFIFD, GPS and IFD1 OFFSET in IFD0
            // serialize IFD0 than EXIFIFD than GPS than IFD1
            if (this.GPS) {
                this.GPSSize = this.GPS.computeSize();
                this.IFD0.setTagHex("8825", 0);
            }
            if (this.IFD1) {
                this.IFD1Size = this.IFD1.computeSize();
            }
            this.IFD0Size = this.IFD0.computeSize();
            this.exifIFDSize = this.exifIFD.computeSize();
            this.exifIFDOffset = this.IFD0Size + 8;
            this.exifIFD.setTagHex("8769", this.exifIFDOffset);
            var nextOffset = this.exifIFDOffset + this.exifIFDSize;
            if (this.GPS) {
                this.gpsOffset = nextOffset;
                this.IFD0.setTagHex("8825", this.gpsOffset);
                nextOffset += this.GPSSize;
            }
            if (this.IFD1) {
                this.IFD1Offset = nextOffset;
                this.IFD0.nextIFDOffset = this.IFD1Offset;
            }
            
            var dv = new DataView(dataStream, offset, 8); //endianness 2 + magic number 2 + offset to 0thIFD: 4
            if (this.le) {
                writeHex(dv, 0, "4D4D");
            } else {
                writeHex(dv, 0, "4949");
            }
            dv.setUint16(2, 42, this.le);
            dv.setUint32(4, 8, this.le);
            var pos = offset + 8;
            this.IFD0.serialize(dataStream, pos);
            this.exifIFD.serialize(dataStream, pos + this.exifIFDOffset);
            if (this.GPS) {
                this.GPS.serialize(dataStream, pos + this.gpsOffset);
            }
            if (this.IFD1) {
                this.IFD1.serialize(dataStream, pos + this.IFD1Offset);
            }
        },
    };


    var App1Exif = function(marker) {
        if (marker) {
            this.markerStart = marker.markerStart;
            this.markerType = marker.markerType;
            this.markerTypeHex = marker.markerTypeHex;
            this.markerSize = marker.markerSize;
            this.markerEnd = marker.markerEnd;
            this.deserialize(marker.deserializeDS, this.markerStart + 10);
        } else {
            this.markerTypeHex = "FFE1";
            this.markerType = parseInt("0x" + this.markerTypeHex);
            this.tiffHeader = new TiffHeader();
            this.markerStart = -1;
            this.markerEnd = -1;
            this.markerSize = this.computeMarkerSize();
        }
    };
    App1Exif.prototype = {
        deserialize: function(dataStream, offset) {
            this.tiffHeader = new TiffHeader();
            this.tiffHeader.deserialize(dataStream, offset);
            //this.tiffHeader = new StreamData(dataStream, offset, this.markerEnd);
        },
        computeMarkerSize: function() {
            var thsize = this.tiffHeader.computeSize();
            var size = 2 + 6 + thsize; // 2 bytes for marker size, 6 bytes for exif signature, tiff header size;
            return size;
        },
        serialize: function(dataStream, offset) {
            var size = this.computeMarkerSize();
            var dv = new DataView(dataStream, offset, 10);
            dv.setUint16(0,this.markerType);
            dv.setUint16(2,size);
            writeHex(dv, 4, "457869660000");
            this.tiffHeader.serialize(dataStream, offset + 10);
            return offset + size + 2;
        }
    };

    var App1XMP = function(marker) {
        if (marker) {
            this.markerStart = marker.markerStart;
            this.markerType = marker.markerType;
            this.markerTypeHex = marker.markerTypeHex;
            this.markerSize = marker.markerSize;
            this.markerEnd = marker.markerEnd;
            this.deserialize(marker.deserializeDS, this.markerStart + 4);
        } else {
            this.markerTypeHex = "FFE1";
            this.markerType = parseInt("0x" + this.markerTypeHex);
            this.tiffHeader = new TiffHeader();
            this.markerStart = -1;
            this.markerEnd = -1;
            this.markerSize = this.computeMarkerSize();
        }
    };
    
    App1XMP.prototype = {
        computeMarkerSize: function() {
            return this.markerSize;
        },
        deserialize: function(dataStream, offset) {
            var dv = new DataView(dataStream, offset, 29);
            this.uri = decodeString(dv, 0, 29);
            var pos = offset + 29;
            var l = this.markerEnd - pos;
            dv = new DataView(dataStream, pos, l);
            
            this.xml = decodeString(dv, 0, l);
            //this.data = new StreamData(dataStream, offset + 4, this.markerEnd);
        },
        serialize: function(dataStream, offset) {
            var size = this.computeMarkerSize();
            var dv = new DataView(dataStream, offset, size +2);
            dv.setUint16(0, this.markerType);
            dv.setUint16(2, size);
            writeString(dv, 4, this.uri);
            writeString(dv, 4 + 29, this.xml);
            //this.data.serialize(dataStream, offset +4);
            return offset + size +2;
        }
    }

    var App1 = function(marker) {
        this.markerStart = marker.markerStart;
        this.markerType = marker.markerType;
        this.markerTypeHex = marker.markerTypeHex;
        this.markerSize = marker.markerSize;
        this.markerEnd = marker.markerEnd;
        //this.deserialize(marker.deserializeDS, this.markerStart + 4);
        this.marker = marker;
    };
    App1.prototype= {
        deserialize: function(dataStream, offset) {
            
            
            var dv = new DataView(dataStream, offset, 6);
            var header = dumpHex(dv, 6);
            if (header === "457869660000") {
                this.appType = "Exif";
            } else if (header === "687474703A2F") {
                this.appType = "XMP";
            }
            if (this.appType === "Exif") {
                this.startOfTiffHeader = offset + 6;

                this.parseTiffHeader(dataStream);
                this.ifd0 = new Ifd();

                this.ifd0.name = "IFD0";
                this.ifd0.deserialize(dataStream, this.idf0OffsetFromTiffH, this.startOfTiffHeader + this.idf0OffsetFromTiffH);                
                var ExifIFDoffset = this.ifd0.getTagByName("ExifOffset");
                if (ExifIFDoffset !== undefined) {
                    var Exifidf0p = new Ifd();
                    Exifidf0p.name = "ExifIFD";
                    Exifidf0p.deserialize(dataStream, ExifIFDoffset.value, ExifIFDoffset.value + this.startOfTiffHeader);
                    console.log(Exifidf0p);
                }                
                if (this.ifd0.nextIFDOffset !== 0) {
                    var idf1p = new Ifd();
                    idf1p.name = "IFD1";
                    idf1p.deserialize(dataStream, this.ifd0.nextIFDOffset, this.ifd0.nextIFDOffset + this.startOfTiffHeader);
                    console.log(idf1p);
                }
                var GPSoffset = this.ifd0.getTagByName("GPSInfo");
                if (GPSoffset !== undefined) {
                    var GPSp = new Ifd();
                    GPSp.name = "GPS";
                    GPSp.deserialize(dataStream, GPSoffset.value, GPSoffset.value + this.startOfTiffHeader);
                    console.log(GPSp);
                }                   
                
            }

        }, 
        serialize: function(dataStream, offset) {
            var size = this.computeMarkerSize();
            var dv = new DataView(dataStream, offset, 4);
            dv.setUint16(this.markerType);
            dv.setUint16(size);            
            if (this.appType === "Exif") {
                var dv = new DataView(dataStream, offset, 6);
                writeHex(dv, 0, "457869660000");
            } else if (this.appType === "XMP") {
                var dv = new DataView(dataStream, offset, 6);
                writeHex(dv, 0, "687474703A2F");                
            }            
        },
        detectType: function() {
            var dataStream = this.marker.deserializeDS;
            var offset = this.marker.markerStart;
            var dv = new DataView(dataStream, offset+ 4, 6);
            var header = dumpHex(dv, 6);
            console.log(header);
            var App1Marker;
            if (header === "457869660000") { // EXIF
                App1Marker = new App1Exif(this.marker);
                //App1Marker.deserialize(dataStream, offset);
                console.log("EXIF !!!!");
            } else if (header === "687474703A2F") {
                App1Marker = new App1XMP(this.marker);                
                //App1Marker.deserialize(dataStream, offset);
                console.log("XMP !!!!");
            } else {                
                App1Marker = this.marker;
                console.log("UNKNOWN !!!");
            }
            return App1Marker;
        }
    };
    

    var Ifd = function() {
        this.tags = [];
        this.name = "IFD0";
    };
    
    Ifd.prototype = {
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
          console.log(tagCount);
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
        deserializeInterop: function(ifdInteropDV, dvOffset) {
            this.tagId =    ifdInteropDV.getUint16(dvOffset, this.le);
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
            this.tagType =  exifDataTypes[ifdInteropDV.getUint16(dvOffset + 2, this.le)];
            this.tagSize =  this.tagType.l;
            this.tagCount = ifdInteropDV.getUint32(dvOffset + 4, this.le);
            var plSize = this.getPayloadSize();
            if (plSize === 0) {
                this.payloadOffset = -1;
                this.deserializePayload(ifdInteropDV,dvOffset + 8);
            } else {
                this.payloadOffset = ifdInteropDV.getUint32(dvOffset + 8, this.le);
                
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



    var StreamData = function(dataStream, start, end) {
        this.dataStream = dataStream;
        this.start = start;
        this.end = end;
        
    };
    StreamData.prototype = {
        computeSize: function() {
            return this.end - this.start;
        },
        serialize: function(dataStream, offset) {
            var dvOut = new DataView(dataStream, offset, this.end - this.start);
            var dvIn = new DataView(this.dataStream, this.start, this.end - this.start);
            for (var i=0; i<this.end - this.start; i++) {
                dvOut.setUint8(i, dvIn.getUint8(i));
                offset +=1;
            }
            this.markerEnd = offset;
        }
    };








    var jpegParser = function(dataStream) {
        this.dataStream = dataStream;
        var dv = new DataView(dataStream, 0, 2);
        var soiMark = dv.getUint16(0);
        
        if (soiMark !== 65496) {
            throw("not a jpeg image ! bad SOI")
        }
        var offset = 2;
        this.markers = [];
        while (offset < this.dataStream.byteLength) {
            var marker = new Marker();
            marker.deserialize(this.dataStream, offset);
            offset = marker.markerEnd;
            if (marker.markerTypeHex === "FFE1") {
                var app1 = new App1(marker);
                app1 = app1.detectType()
                //this.markers.push(marker);
                this.markers.push(app1);
            } else {
                this.markers.push(marker);
            }                        
            if (marker.markerTypeHex === "FFDA") {
                this.streamStart = marker.markerEnd;
                this.streamSize = this.dataStream.byteLength - 2 - this.streamStart;
                this.raw = new StreamData(this.dataStream, this.streamStart, this.dataStream.byteLength - 2);
                break;
            }
        }
    };

    jpegParser.prototype = {
        save: function() {
            var size = 2;
            for (var i=0; i< this.markers.length; i++) {
                size += this.markers[i].computeMarkerSize() +2;
            }
            size += 2;
            size += this.raw.end - this.raw.start;
            var dataStream = new ArrayBuffer(size);
            var dv = new DataView(dataStream, 0, 2);
            
            dv.setUint16(0, 65496); //SOI
            
            var offset = 2;
            for (var i=0; i< this.markers.length; i++) {
                var size = this.markers[i].computeMarkerSize();
                this.markers[i].serialize(dataStream, offset);
                offset += size +2;
            }
            this.raw.serialize(dataStream, offset);
            var dv = new DataView(dataStream, this.raw.markerEnd, 2);
            
            dv.setUint16(0, 65497); //EOI
            
            //return _arrayBufferToBase64(dataStream);
            return dataStream;
        }
    
    };

    return  jpegParser;
});
