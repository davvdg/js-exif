

define(["utils", "Tag"], function(utils, Tag) {
    

    
    var Ifd = function(name) {
        this.tags = [];
        if (name) {this.name = name;}
        this.nextIFDOffset = 0;
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
      setTagByHex : function(hex, value, type) {
          var id = parseInt("0x" + hex);
          for (var i=0; i < this.tags.length; i++) {              
              if (this.tags[i].tagId === id) {
                  this.tags[i].setValue(value);
                  return  this.tags[i];
              }
          }
          // tag not found
          var tag = new Tag();
          tag.setTagTypeByName(type);
          tag.container = this;
          tag.tagId = id;
          tag.loadDefinition();
          tag.setValue(value);
          this.tags.push(tag);
          return tag;
      },
      serialize: function(dataStream, offsetFromTiffStart, offsetFromSoi) {
          console.log("serializing " + this.tags.length + " tags starting at from start " + offsetFromSoi + " and from tiff header : " + offsetFromTiffStart); 
          var interopSize = 2;
          var payloadSize = this.computePayloadSize();
          var tagSize = this.tags.length * 12;
          console.log("interop tags size: " + tagSize + " payload size " + payloadSize);
          var nextOffsetSize = 2;
          
          var ifdInteropSize = 2 + this.tags.length * 12 + 2;
          
          var dv = new DataView(dataStream, offsetFromSoi, payloadSize + tagSize + nextOffsetSize + interopSize);
          console.log("dvSize:" +  (payloadSize + tagSize + nextOffsetSize + interopSize));
          this._wTagCount(dv);
          var i;
          var tagPlOffset = offsetFromTiffStart + ifdInteropSize;
          for (i=0; i<this.tags.length; i++) {
              var plSize = this.tags[i].getPayloadSize();
              if (plSize > 4) {
                  this.tags[i].payloadOffset = tagPlOffset;
                  tagPlOffset += plSize;
              }
              this.tags[i].serializeInterop(dv, i*12 + interopSize);
          }
          console.log("----------tagPlOffset " + tagPlOffset);
          dv.setUint16(this.tags.length * 12 + interopSize, this.nextIFDOffset);          
          console.log("next IFD is " + this.nextIFDOffset);
          var payloadStart = tagSize +interopSize + nextOffsetSize;
          //console.log(payloadStart);
          var payloadOffset = 0;
          for (i=0; i<this.tags.length; i++) {
              
              var plsize  = this.tags[i].getPayloadSize();
              //console.log(plsize);
              this.tags[i].serializePayload(dv, payloadStart); // payload start is start from tiff header
              payloadStart += plsize;
          }          
          
      },
      deserialize: function(dataStream, offsetFromTiffHeader, offsetFromSOI) { // offset from begining of the file... need to get the offset from tiff header
          //console.log(offsetFromSOI);
          var offset = offsetFromSOI;
          var interopSize = 2; 
          var dv = new DataView(dataStream, offset, interopSize);
          //console.log(utils.dumpHex(dv,0,2));
          var tagCount = this._rTagCount(dv);
          console.log(tagCount);
          var nextIFDOffsetSize = 2;
          dv = new DataView(dataStream, offset+interopSize, tagCount * 12 + nextIFDOffsetSize);
          console.log(utils.dumpHex(dv, 0, tagCount * 12 + nextIFDOffsetSize));
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
          dv = new DataView(dataStream, offset+ interopSize + nextIFDOffsetSize + tagCount *12, plSize);
          //console.log(plSize);
          //console.log(offset+ interopSize + nextIFDOffsetSize + tagCount *12          );
          var plOffset = -(offsetFromTiffHeader + interopSize + nextIFDOffsetSize + tagCount *12);          
          for (i = 0; i< tagCount; i++) {
              this.tags[i].deserializePayload(dv, plOffset + this.tags[i].payloadOffset); // offset to start of tiff header -> offset + 
              if (this.tags[i].payloadOffset>0) {
                //console.log(this.tags[i].payloadOffset + offsetFromTiffHeader, this.tags[i].plSize);

            }
          }
          this.endOffset = offset + interopSize + nextIFDOffsetSize + tagCount *12 + plSize - 25;
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
      computeInteropSize: function() {
          var size = 2 + 2; // interop size + nextIFD size;
          size += this.tags.length * 12;
          return size;
      },
      /**
       * compute the full size of an ifd, ie interop tag (count), 
       * next ifd offset, all tags interop, and all tags extra payload
       * @returns {Number} the size of the Ifd in Bytes
       */
      computeSize : function() {
          var size = 0;
          size += this.computeInteropSize();
          size += this.computePayloadSize();
          return size;
      }
    }; 
    var Ifd0 = function() {
        Ifd.call(this, "IFD0");
        this.setTagByHex("011A", [96.0], "RATIONAL");
        this.setTagByHex("011B", [96.0], "RATIONAL");
        this.setTagByHex("0128", ["inches"], "SHORT");
        this.setTagByHex("0213", ["Centered"], "SHORT");
    };
    
    Ifd0.prototype = Object.create(Ifd.prototype);    

    var ExifIfd = function() {
        Ifd.call(this, "ExifIFD");
        this.setTagByHex("9000", ["30","32","32","31"],"UNDEFINED"); // exif version
        this.setTagByHex("9101", ["-", "Y", "-", "Cb", "-", "Cr", "-", "-"],"UNDEFINED"); // componentConf 
        this.setTagByHex("A000", ["30","31","30","30"],"UNDEFINED"); // flashpix
        this.setTagByHex("A001", ["sRGB"],"SHORT"); // colorspace
        this.setTagByHex("A002", [800],"SHORT"); // pixelXDimension
        this.setTagByHex("A003", [800],"SHORT"); // pixelYDimension
    };
    
    ExifIfd.prototype = Object.create(Ifd.prototype);    
    return {
        Ifd:Ifd,
        Ifd0: Ifd0,
        ExifIfd: ExifIfd
    };    
});