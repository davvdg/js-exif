

define(["utils", "Tag"], function(utils, Tag) {
    var Ifd = function(name) {
        this.tags = [];
        if (name) {this.name = name;}
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
      setTagByHex : function(hex, value) {
          var id = parseInt("0x" + hex);
          for (var i=0; i < this.tags.length; i++) {              
              if (this.tags[i].tagId === id) {
                  this.tags[i].setValue(value);
                  return true;
              }
          }
          // tag not found
          var tag = new Tag();
          tag.container = this;
          tag.loadDefinition(id);
          tag.setValue(value);
          this.tags.push(tag);
          return true;
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
              this.tags[i].writeTagInterop(dv, i*12 + interopSize);
          }
          dv.setUint16(this.tags.length * 12 + interopSize, this.nextIFDOffset);
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
          //console.log(utils.dumpHex(dv,0,2));
          var tagCount = this._rTagCount(dv);
          console.log(tagCount);
          var nextIFDOffsetSize = 2;
          dv = new DataView(dataStream, offset+interopSize, tagCount * 12 + nextIFDOffsetSize);
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
    return Ifd;
});