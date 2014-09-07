/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
define(["utils", "Ifd"], function(utils, Ifd) {
  

    var Marker = function() {
        
    };
    Marker.prototype = {
        deserialize: function(dataStream, offset) {
            var dv = new DataView(dataStream, offset, 4);
            this.deserializeDS = dataStream;
            this.markerStart = offset;
            this.markerType = dv.getUint16(0);
            this.markerTypeHex = utils.dumpHex(dv, 0, 2);
            this.markerSize = dv.getUint16(2);
            this.markerEnd = offset + 2 + this.markerSize;
            
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
        this.le = false
        this.IFD0 = new Ifd.Ifd0();
        this.exifIFD = new Ifd.ExifIfd();
        this.IFD0.setTagByHex("8769", [0],"LONG");        
        this.GPS = undefined;
        this.IFD1 = undefined;
    };
    TiffHeader.prototype = {
        addGPSIfd: function() {
            if (!this.GPS) {
                this.GPS = new Ifd.Ifd("GPS");
                this.GPS.setTagByHex("0000", [2,2,0,0], "BYTE");
                this.GPS.setTagByHex("0001", "N", "ASCII");
                this.GPS.setTagByHex("0002", [0, 0, 0], "RATIONAL");
                this.GPS.setTagByHex("0003", "E", "ASCII");
                this.GPS.setTagByHex("0004", [0, 0, 0], "RATIONAL");
                this.GPS.setTagByHex("0005", [0], "BYTE");
                this.GPS.setTagByHex("0006", [0], "RATIONAL");
                this.GPS.setTagByHex("0017", "T", "ASCII");
                this.GPS.setTagByHex("0018", [0], "RATIONAL");
            }   
            return this.GPS;
        },
        deserialize: function(dataStream, offset) { // this offset is the start off the tiff header from the start of the file
            //console.log("begin deserializing Tiff from " + (offset));

            var dv = new DataView(dataStream, offset, 8); // 2 + 2 + 4
            var byteOrder = utils.decodeString(dv, 0, 2);
            if (byteOrder === "MM") {
                this.le = false;
            } else if (byteOrder === "II") {
                this.le = true;
            } else {
                throw "cannot detect endianess";
            }
            //console.log("42: " +dv.getUint16(2,this.le));
            if (dv.getUint16(2,this.le) !== 42) throw "cannot find 42";
            this.idf0OffsetFromTiffH = dv.getUint32(4, this.le); // start idf0 + start tiff header

            //console.log("begin deserializing IFD0 from " + (offset + this.idf0OffsetFromTiffH));
            console.log("start of IFD0 from Tiff header " + this.idf0OffsetFromTiffH );
            console.log("start of IFD0 from SOI " + (this.idf0OffsetFromTiffH + offset ));

            this.IFD0 = new Ifd.Ifd("IFD0");
            this.IFD0.deserialize(dataStream, this.idf0OffsetFromTiffH, offset + this.idf0OffsetFromTiffH);
            //console.log("dist from SOI:" + (offset + this.idf0OffsetFromTiffH + this.IFD0.computeSize()));
            //console.log(this.IFD0);
            var ExifIFDoffset = this.IFD0.getTagByName("ExifOffset");
            if (ExifIFDoffset !== undefined) {
                this.exifIFD = new Ifd.Ifd("ExifIFD");
                //console.log("begin deserializing Exif from " + (ExifIFDoffset.value[0] + offset ));
                this.exifIFD.deserialize(dataStream, ExifIFDoffset.value[0], ExifIFDoffset.value[0] + offset);
                //console.log(this.exifIFD);
            }
            if (this.IFD0.nextIFDOffset !== 0) {
                console.log(this.IFD0.nextIFDOffset);
               // console.log("I have an IFD1 to deserialize !!!");
                this.IFD1 = new Ifd.Ifd("IFD1");
                this.IFD1.deserialize(dataStream, this.IFD0.nextIFDOffset, this.IFD0.nextIFDOffset + offset);
                //console.log(this.IFD1);
            }
            var GPSoffset = this.IFD0.getTagByName("GPSInfo");
            if (GPSoffset !== undefined) {
                //console.log("I have an GPS to deserialize !!!");
                //console.log(GPSoffset.value[0]);
                this.GPS = new Ifd.Ifd("GPS");
                this.GPS.container = this;
                //console.log("begin deserializing GPS from " + (GPSoffset.value[0] + offset +this.idf0OffsetFromTiffH ));

                this.GPS.deserialize(dataStream, GPSoffset.value[0], GPSoffset.value[0] + offset);
                //console.log(this.GPS);
            }
        },
        computeSize: function() {
            var size = 8;
            if (this.GPS) {
                this.GPSSize = this.GPS.computeSize();
                this.IFD0.setTagByHex("8825", [0],"LONG");
                size += this.GPSSize;
                console.log(size);
            }
            if (this.IFD1) {
                this.IFD1Size = this.IFD1.computeSize();
                size += this.IFD1Size;
                console.log(size);
            }
            this.IFD0Size = this.IFD0.computeSize();
            console.log(this.IFD0Size);
            this.exifIFDSize = this.exifIFD.computeSize();
            console.log(this.exifIFDSize);
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
                this.IFD0.setTagByHex("8825", [0],"LONG");;
            }
            if (this.IFD1) {
                this.IFD1Size = this.IFD1.computeSize();
            }
            this.IFD0Size = this.IFD0.computeSize();
            this.exifIFDSize = this.exifIFD.computeSize();
            
            var offsetFromTiffStart = 8;
            
            this.exifIFDOffset = this.IFD0Size + offsetFromTiffStart; // offset from start of header
            this.IFD0.setTagByHex("8769", [this.exifIFDOffset +8],"LONG");
            
            
            var nextOffset = this.exifIFDOffset + this.exifIFDSize;
            if (this.GPS !== undefined) {
                this.gpsOffset = nextOffset;
                this.IFD0.setTagByHex("8825", [this.gpsOffset],"LONG");;
                nextOffset += this.GPSSize;
            }
            if (this.IFD1 !== undefined) {
                this.IFD1Offset = nextOffset;
                this.IFD0.nextIFDOffset = this.IFD1Offset;
            }
            
            var dv = new DataView(dataStream, offset, 8); //endianness 2 + magic number 2 + offset to 0thIFD: 4
            if (this.le) {
                utils.writeHex(dv, 0, "4949");
            } else {
                utils.writeHex(dv, 0, "4D4D");
            }
            dv.setUint16(2, 42, this.le);
            dv.setUint32(4, 8, this.le);
            var posFromSoi = offset + offsetFromTiffStart;
            this.IFD0.serialize(dataStream, offsetFromTiffStart, posFromSoi);
            this.exifIFD.serialize(dataStream, offsetFromTiffStart + this.exifIFDOffset, posFromSoi + this.exifIFDOffset);
            if (this.GPS) {
                this.GPS.serialize(dataStream, this.gpsOffset, offset + this.gpsOffset);
            }
            if (this.IFD1) {
                this.IFD1.serialize(dataStream, offsetFromTiffStart + this.IFD1Offset, posFromSoi + this.IFD1Offset);
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
            console.log(thsize);
            var size = 2 + 6 + thsize; // 2 bytes for marker size, 6 bytes for exif signature, tiff header size;
            return size;
        },
        serialize: function(dataStream, offset) {
            var size = this.computeMarkerSize();
            var dv = new DataView(dataStream, offset, 10);
            dv.setUint16(0,this.markerType);
            dv.setUint16(2,size);
            //console.log("Exif".charCodeAt(0));
            //console.log("Exif".charCodeAt(1));
            //console.log("Exif".charCodeAt(2));
            //console.log("Exif".charCodeAt(3));
            utils.writeHex(dv, 4, "457869660000");
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
            this.uri = utils.decodeString(dv, 0, 29);
            var pos = offset + 29;
            var l = this.markerEnd - pos;
            dv = new DataView(dataStream, pos, l);
            
            this.xml = utils.decodeString(dv, 0, l);
            //this.data = new StreamData(dataStream, offset + 4, this.markerEnd);
        },
        serialize: function(dataStream, offset) {
            var size = this.computeMarkerSize();
            var dv = new DataView(dataStream, offset, size +2);
            dv.setUint16(0, this.markerType);
            dv.setUint16(2, size);
            utils.writeString(dv, 4, this.uri);
            utils.writeString(dv, 4 + 29, this.xml);
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
        detectType: function() {
            var dataStream = this.marker.deserializeDS;
            var offset = this.marker.markerStart;
            var dv = new DataView(dataStream, offset+ 4, 6);
            var header = utils.dumpHex(dv, 0, 6);
            //console.log(header);
            var App1Marker;
            console.log(header);
            if (header === "457869660000") { // EXIF
                App1Marker = new App1Exif(this.marker);
                //App1Marker.deserialize(dataStream, offset);
                //console.log("EXIF !!!!");
            } else if (header === "687474703A2F") {
                App1Marker = new App1XMP(this.marker);                
                //App1Marker.deserialize(dataStream, offset);
                //console.log("XMP !!!!");
            } else {                
                App1Marker = this.marker;
                //console.log("UNKNOWN !!!");
            }
            return App1Marker;
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
        getMarkersByHex: function(hex) {
            return this.markers.filter(function(item) {
                return item.markerTypeHex === hex;
            });

        },
        addApp1ExifMarker: function() {
            var a = new App1Exif();
            this.markers.splice(0,0,a);
            return a;
        },
        addApp1XMPMarker: function() {
            
        },        
        save: function() {
            var size = 2;
            for (var i=0; i< this.markers.length; i++) {
                var mSize = this.markers[i].computeMarkerSize() +2;
                console.log(mSize);
                size += mSize;
            }
            size += 2;
            size += this.raw.end - this.raw.start;
            var dataStream = new ArrayBuffer(size);
            var dv = new DataView(dataStream, 0, 2);
            
            dv.setUint16(0, 65496); //SOI
            
            var offset = 2;
            for (var i=0; i< this.markers.length; i++) {
                //console.log("offset: " + offset);
                var size = this.markers[i].computeMarkerSize();
                this.markers[i].serialize(dataStream, offset);
                offset += size +2;
            }
            this.raw.serialize(dataStream, offset);
            var dv = new DataView(dataStream, this.raw.markerEnd, 2);
            
            dv.setUint16(0, 65497); //EOI
            
            //return utils._arrayBufferToBase64(dataStream);
            return dataStream;
        }
    
    };

    return  jpegParser;
});
