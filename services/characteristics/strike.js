
const util = require('util');
const bleno = require('bleno');
const DDB = require('../../aws-ddb');
const Gpio = require('onoff').Gpio;

var DoorStrikeCharacteristic = function(service) {
  DoorStrikeCharacteristic.super_.call(this, {
    uuid: 'a1fd909e-b168-452a-99fe-621db9c0111a',
    properties: [ 'read' ],
    value: null
  });

  this._value = 1; // Consider magnetic lock as initially operating
  this.service = service;
  this.timeout = null;
  this.relay = new Gpio(3, 'out');
  this.relay.writeSync(this._value);
  this.led = new Gpio(7, 'out');
  this.led.writeSync(this._value);
};

util.inherits(DoorStrikeCharacteristic, bleno.Characteristic);

DoorStrikeCharacteristic.prototype.onReadRequest = function(offset, callback) {
  console.log('[DoorStrikeCharacteristic Read]:', this._value);

  callback(this.RESULT_SUCCESS, this._value);
};

DoorStrikeCharacteristic.prototype.unlock = function() {
  console.log('[DoorStrikeCharacteristic Unlock]');

  DDB.log('Door unlocked', 'event');

  this._value = 0;
  this.relay.writeSync(0);
  this.led.writeSync(0);
  clearTimeout(this.timeout);
  this.timeout = setTimeout(this.lock, 5000, this);
};

DoorStrikeCharacteristic.prototype.lock = function(ref) {
  console.log('[DoorStrikeCharacteristic Lock]');

  DDB.log('Door locked', 'event');

  // Hack to work with timeout:
  if (typeof ref === 'undefined') ref = this
  ref._value = 1;
  ref.relay.writeSync(1);
  ref.led.writeSync(1);
  clearTimeout(ref.timeout);
};

module.exports = DoorStrikeCharacteristic;

