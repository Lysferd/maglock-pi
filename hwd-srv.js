
const util = require('util');
const bleno = require('bleno');

const HardwareSerialNumberCharacteristic = require('./hwd-sn-chr');

var HardwareService = function() {
  HardwareService.super_.call(this, {
    uuid: '180a',
    characteristics: [
      new HardwareSerialNumberCharacteristic()
    ]
  });
};

util.inherits(HardwareService, bleno.PrimaryService);

module.exports = HardwareService;

