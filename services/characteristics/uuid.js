
const util = require('util');
const bleno = require('bleno');
const DDB = require('../../aws-ddb');

var HardwareSerialNumberCharacteristic = function() {
  HardwareSerialNumberCharacteristic.super_.call(this, {
    uuid: '2a25',
    properties: [ 'read' ],
    value: Buffer.from(DDB.uuid()),
    descriptors: [
      new bleno.Descriptor({
        uuid: '2901',
        value: 'hardware serial number'
      })
    ]
  });
}

util.inherits(HardwareSerialNumberCharacteristic, bleno.Characteristic);
module.exports = HardwareSerialNumberCharacteristic;

