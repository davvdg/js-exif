

define(["tagBuilder", "utils"], function(tagBuilder, utils) {
    var exifDataTypes = {
            1:{type: "BYTE",        func: "getUint8", funcr:"setUint8", l:1, v:1}, 
            2:{type: "ASCII",       func: "getUint8", funcr:"setUint8", l:1, v:2},
            3:{type: "SHORT",       func: "getUint16",funcr:"setUint16",l:2, v:3},
            4:{type: "LONG",        func: "getUint32",funcr:"setUint32", l:4, v:4},
            5:{type: "RATIONAL",    func: "getUint32",funcr:"setUint32", l:8, v:5},
            7:{type: "UNDEFINED",   func: "getUint8", funcr:"setUint8",l:1, v:7},
            9:{type: "SLONG",       func: "getInt32", funcr:"setInt32", l:4, v:9},
            10:{type: "SRATIONAL",  func: "getInt32", funcr:"setUint32", l:8, v:10}
            };
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
    var tagsLut = tagBuilder;

    var Tag = function() {
        this.le = false;
        this.rawValue = [];
        
    };
    Tag.prototype= {
        setTagTypeByName: function(value) {
            var type = {
                "BYTE":     exifDataTypes[1],
                "ASCII":    exifDataTypes[2],
                "SHORT":    exifDataTypes[3],
                "LONG":     exifDataTypes[4],
                "RATIONAL": exifDataTypes[5],
                "UNDEFINED":exifDataTypes[7],
                "SLONG":    exifDataTypes[9],
                "SRATIONAL":exifDataTypes[10]                
            };
            this.tagType = type[value];
            return this;
        },
        loadDefinition: function() {
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
            if (!this["info"]) {
                tagsLut.tags.forEach(function(item) {
                    if (item.idn === self.tagId) {
                        self["info"] = item;
                        self["tagDesc"] = item.tagName;
                    }
                });
            }
        },
        setValue: function(value) {
            if (this.info) {
                if (Object.keys(this.info.values).length > 0) {
                    this.rawValue = [];
                    for (var i=0; i< value.length; i++) {
                        for( var prop in this.info.values ) {
                            var key = undefined;
                            if (this.info.values.hasOwnProperty(prop)) {
                                if( this.info.values[prop] === value[i] ) {
                                    key = prop;
                                    break;
                                }
                            }
                        }
                        if (key === undefined) {
                            throw("TAG error: setting a value that should be an enum but is not known from the tag definition. values are " + JSON.stringify(this.info.values));
                        }
                        this.rawValue[i] = parseInt(key);
                    }
                    
                }                
            }
            this.tagCount = value.length;
            this.value = value;
        },
        computePayloadSize: function() {
            var plSize = 0;
            if (this.tagType.type ==="ASCII") {
                plSize = this.value.length;
            } else {
                plSize = this.tagCount * this.tagType.l;
            }
            return plSize;
        },
        getPayloadSize: function() {
            if (this.fullyDeserialized) {
                return this.computePayloadSize();
            } else {
                var plSize = this.tagCount * this.tagType.l;
                if (plSize > 4) {
                    this.plSize = plSize;
                    return this.plSize;
                }
                this.plSize = 0;
                return this.plSize;
            }
        },
        deserializeInterop: function(ifdInteropDV, dvOffset) {
            
            this.fullyDeserialized = false;
            this.tagId =    ifdInteropDV.getUint16(dvOffset, this.le);
            
            // lookup tags in dictionary
            console.log(this.tagId);
            this.loadDefinition();
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
            if (!this.fullyDeserialized) {
                if (this.tagType.type === "UNDEFINED") {
                    this.value = [utils.dumpHex(payloadDV, payloadOffset, this.tagCount)];
                } else if (this.tagType.type === "ASCII") {
                    this.value = utils.decodeString(payloadDV, payloadOffset, this.tagCount);
                } else {
                    this.value = [];
                    this.rawValue = [];
                    for (var i = 0; i< this.tagCount; i++) {
                        if (this.tagType.type === "RATIONAL" || this.tagType.type === "SRATIONAL") { 
                            var num = payloadDV[this.tagType.func](payloadOffset + i*this.tagType.l + 0, this.le);
                            var den = payloadDV[this.tagType.func](payloadOffset + i*this.tagType.l + 4, this.le);
                            this.value.push(num/den);
                        } else {
                            var value = payloadDV[this.tagType.func](payloadOffset, this.le);
                            if (this.info.values[value]) {
                                this.value.push(this.info.values[value]);
                                this.rawValue.push(value);
                            } else {
                                console.log("no lookup found for " + value);
                                this.value.push(value);
                            }
                        }
                    }
                }
                this.fullyDeserialized = true;
            }            
        },
        serializeInterop: function(ifdInteropDV, offset) {
            console.log(this.tagDesc + " size " + this.tagCount * this.tagType.l);
            this.fullySerialized = false;
            ifdInteropDV.setUint16(offset, this.tagId, this.le);
            ifdInteropDV.setUint16(offset + 2, this.tagType.v, this.le);
            var count = this.value.length;
            console.log(count);
            console.log(this.value);            
            ifdInteropDV.setUint32(offset + 4, count, this.le);
            if ((count * this.tagType.l) <=4) {
                this.serializePayload(ifdInteropDV, offset +8);
                this.fullySerialized = true;
            } else {
                ifdInteropDV.setUint32(offset +8, this.payloadOffset);
            }
        },
        serializePayload: function(ifdPayloadDV, offset) {
            var o = offset;
            console.log("payload of " + this.tagDesc);
            if (!this.fullySerialized) {
                if (this.tagType.type === "ASCII") {
                    return utils.writeString(ifdPayloadDV, offset, this.value);                     
                } else {
                    for (var i=0; i < this.value.length; i++) {                        
                        if (this.tagType.type === "RATIONAL" || this.tagType.type === "SRATIONAL") {
                            console.log("offset: " + offset);
                            var frac = utils.fraction(this.value[i]);
                            ifdPayloadDV[this.tagType.funcr](offset, frac[0]);
                            ifdPayloadDV[this.tagType.funcr](offset +4, frac[1]);
                        } else {
                            var val;
                            if (this.rawValue[i]) {
                                val = this.rawValue[i];
                            } else {
                                val = this.value[i];
                            }
                            if (this.tagType.type === "UNDEFINED") {
                                utils.writeHex(ifdPayloadDV, offset, val);
                            } else {
                                ifdPayloadDV[this.tagType.funcr](offset, val);
                                
                            }
                        }
                        offset += this.tagType.l;
                    }
                }
                console.log("payload:" +  utils.dumpHex(ifdPayloadDV, o, this.tagCount * this.tagType.l));

                this.fullySerialized = true;
            }
            return offset;
        }
    };
    return Tag;
});