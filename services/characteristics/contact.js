 
var util = require('util');
var bleno = require('bleno');
var Gpio = require('onoff').Gpio;

var Descriptor = bleno.Descriptor;
var Characteristic = bleno.Characteristic;

var contact_input = new Gpio(4, 'in', 'both');
var contact_state = contact_input.readSync();
var updateCallback = null;
var door_service;

var DoorContactCharacteristic = function(service) {
  DoorContactCharacteristic.super_.call(this, {
    uuid: 'e53a7a22-0850-48e5-9f25-5864e71eb00a',
    properties: [ 'read', 'notify' ],
    value: null
  });

  this._value = contact_state;
  door_service = service;
};

util.inherits(DoorContactCharacteristic, Characteristic);

DoorContactCharacteristic.prototype.onReadRequest =
  function(offset, callback) {
    var value = Buffer.from([contact_state]);
    console.log('[DoorContactCharacteristic READ]:', value);
    callback(this.RESULT_SUCCESS, value);
  };

DoorContactCharacteristic.prototype.onSubscribe =
  function(maxValueSize, updateValueCallback) {
    console.log('[DoorContactCharacteristic Subscribe]:', maxValueSize, updateValueCallback);
    updateCallback = updateValueCallback;
  };

DoorContactCharacteristic.prototype.onUnsubscribe =
  function() {
    console.log('[DoorContactCharacteristic Unsubscribe]');
    updateCallback = null;
  };

module.exports = DoorContactCharacteristic;

contact_input.watch((err, value) => {
  if (err) {
    console.log('[DoorContactCharacteristic Error]:', err);
    throw err
  }

  if (value) door_service.doorClosed()
  else door_service.doorOpened()

  contact_state = value;
  var data = Buffer.from([value]);
  console.log('[DoorContactCharacteristic Update]:', value, data);

  if (updateCallback) {
    console.log('[DoorContactCharacteristic Notify]:', data);
    updateCallback(data);
  }
});

