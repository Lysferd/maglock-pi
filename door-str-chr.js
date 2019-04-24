
const util = require('util');
const bleno = require('bleno');
const DDB = require('./aws-ddb');
const Gpio = require('onoff').Gpio;

var DoorSTRCharacteristic = function(service, initial_value) {
  DoorSTRCharacteristic.super_.call(this, {
    uuid: 'a1fd909e-b168-452a-99fe-621db9c0111a',
    properties: [ 'read' ],
    value: null
  });

  this._value = initial_value;
  this.service = service;
  this.timeout = null;
  this.led = new Gpio(14, 'out');
  this.led.writeSync(this._value);
};

util.inherits(DoorSTRCharacteristic, bleno.Characteristic);

DoorSTRCharacteristic.prototype.onReadRequest = function(offset, callback) {
  console.log('[DoorSTRCharacteristic Read]:', this._value);

  callback(this.RESULT_SUCCESS, this._value);
};

DoorSTRCharacteristic.prototype.unlock = function() {
  console.log('[DoorSTRCharacteristic Unlock]');

  DDB.log('Door unlocked', 'event');

  this._value = 0;
  this.led.writeSync(0);
  this.timeout = setTimeout(this.lock, 5000, this);
};

DoorSTRCharacteristic.prototype.lock = function(ref) {
  console.log('[DoorSTRCharacteristic Lock]');

  DDB.log('Door locked', 'event');

  // Hack to work with timeout:
  if (typeof ref === 'undefined') ref = this
  ref._value = 1;
  ref.led.writeSync(1);
  clearTimeout(ref.timeout);
};

module.exports = DoorSTRCharacteristic;

