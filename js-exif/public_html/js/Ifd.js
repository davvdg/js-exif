

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
          this.tags.sort(function(a, b){
              return a.tagId - b.tagId;
          });
          //console.log("serializing " + this.tags.length + " tags starting at from start " + offsetFromSoi + " and from tiff header : " + offsetFromTiffStart); 
          var interopSize = 2;
          var payloadSize = this.computePayloadSize();
          var tagSize = this.tags.length * 12;
          //console.log("interop tags size: " + tagSize + " payload size " + payloadSize);
          var nextOffsetSize = 4;
          
          var ifdInteropSize = interopSize + tagSize + nextOffsetSize;
          
          var dv = new DataView(dataStream, offsetFromSoi, payloadSize + ifdInteropSize);
          //console.log("dvSize:" +  (payloadSize + tagSize + nextOffsetSize + interopSize));
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
          //console.log("----------tagPlOffset " + tagPlOffset);
          dv.setUint32(tagSize + interopSize, this.nextIFDOffset);          
          //console.log("next IFD is " + this.nextIFDOffset);
          var payloadStart = ifdInteropSize;
          //console.log(payloadStart);
          for (i=0; i<this.tags.length; i++) {
              this.tags[i].tagId;
              var plsize  = this.tags[i].getPayloadSize();
              //console.log(plsize);
              this.tags[i].serializePayload(dv, payloadStart); // payload start is start from tiff header
              payloadStart += plsize;
          }          
          
      },
      deserialize: function(dataStream, offsetFromTiffHeader, offsetFromSOI) { // offset from begining of the file... need to get the offset from tiff header
          //console.log(offsetFromSOI);
          this.tags = [];
          var interopSize = 2; 
          console.log("interop " + offsetFromSOI);
          var dv = new DataView(dataStream, offsetFromSOI, interopSize);
          //console.log(utils.dumpHex(dv,0,2));
          var tagCount = this._rTagCount(dv);
          console.log("tag count " + tagCount);
          var nextIFDOffsetSize = 4;
          dv = new DataView(dataStream, offsetFromSOI + interopSize, tagCount * 12 + nextIFDOffsetSize);
          console.log("tags" + (offsetFromSOI + interopSize));
          //console.log(utils.dumpHex(dv, 0, tagCount * 12 + nextIFDOffsetSize));
          var plSize = 0;
          var i;          
          for (i = 0; i< tagCount; i++) {
              var tag = new Tag();
              tag.le = this.le
              tag.container = this;
              tag.deserializeInterop(dv, i * 12);
              if (tag.payloadOffset>0) {
                plSize = Math.max(plSize, tag.payloadOffset + tag.tagCount*tag.tagType.l);
              }
              //plSize += tag.getPayloadSize();
              this.tags.push(tag);
          }
          plSize -= offsetFromTiffHeader + interopSize + nextIFDOffsetSize + tagCount *12;
          if (plSize < 0)  { plSize = 0};
          console.log("plSize" + plSize);
          this.nextIFDOffset = dv.getUint32(tagCount *12, this.le);
          console.log("payload " + (offsetFromSOI + interopSize + nextIFDOffsetSize + tagCount *12));

          dv = new DataView(dataStream, offsetFromSOI + interopSize + nextIFDOffsetSize + tagCount *12, plSize);
          //console.log(plSize);
          console.log(offsetFromSOI+ interopSize + nextIFDOffsetSize + tagCount *12          );
          var plOffset = -(offsetFromTiffHeader + interopSize + nextIFDOffsetSize + tagCount *12);
          console.log(plOffset);
          for (i = 0; i< tagCount; i++) {
              if (this.tags[i].payloadOffset>0) {
                console.log("------------");
                console.log("abs " + this.tags[i].payloadOffset);  
                console.log("rel " + (plOffset + this.tags[i].payloadOffset));
                console.log("size " + this.tags[i].getPayloadSize());
                this.tags[i].deserializePayload(dv, plOffset + this.tags[i].payloadOffset); // offset to start of tiff header -> offset + 

                //console.log(this.tags[i].payloadOffset + offsetFromTiffHeader, this.tags[i].plSize);

            }
          }
      },
      _rTagCount: function(dv) {
          var tagCount = dv.getUint16(0, this.le);
          return tagCount;
      },
      _wTagCount: function(dv) {
          dv.setUint16(0, this.tags.length, this.le);
      },
      computePayloadSize: function() {
          var plSize = 0;
          for (var i=0; i<this.tags.length; i++) {
              plSize += this.tags[i].getPayloadSize();
              console.log(this.tags[i].tagDesc + " size added: " + plSize);
          }
          return plSize;
      },
      computeInteropSize: function() {
          var size = 2 + 4; // interop size + nextIFD size;
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
          console.log(this.name + " interop size " + size);
          size += this.computePayloadSize();
          console.log(this.name + " size with payload size " + size);
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
        this.setTagByHex("829A", ["0.01"],"RATIONAL");
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