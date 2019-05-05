 
var util = require('util');
var bleno = require('bleno');
var Gpio = require('onoff').Gpio;

var Descriptor = bleno.Descriptor;
var Characteristic = bleno.Characteristic;

var contact_input = new Gpio(2, 'in', 'both', {debounceTimeout: 500});
var contact_state = contact_input.readSync();
var updateCallback = null;
var door_service;

var DoorCNTCharacteristic = function(service) {
  DoorCNTCharacteristic.super_.call(this, {
    uuid: 'e53a7a22-0850-48e5-9f25-5864e71eb00a',
    properties: [ 'read', 'notify' ],
    value: null
  });

  this._value = contact_state;
  door_service = service;
};

util.inherits(DoorCNTCharacteristic, Characteristic);

DoorCNTCharacteristic.prototype.onReadRequest =
  function(offset, callback) {
    var value = Buffer.from([contact_state]);
    console.log('[DoorCNTCharacteristic READ]:', value);
    callback(this.RESULT_SUCCESS, value);
  };

DoorCNTCharacteristic.prototype.onSubscribe =
  function(maxValueSize, updateValueCallback) {
    console.log('[DoorCNTCharacteristic Subscribe]:', maxValueSize, updateValueCallback);
    updateCallback = updateValueCallback;
  };

DoorCNTCharacteristic.prototype.onUnsubscribe =
  function() {
    console.log('[DoorCNTCharacteristic Unsubscribe]');
    updateCallback = null;
  };

module.exports = DoorCNTCharacteristic;

contact_input.watch((err, value) => {
  if (err) {
    console.log('[DoorCNTCharacteristic Error]:', err);
    throw err
  }

  if (value) door_service.doorOpened()
  else door_service.doorClosed()

  contact_state = value;
  var data = Buffer.from([value]);
  console.log('[DoorCNTCharacteristic Update]:', value, data);

  if (updateCallback) {
    console.log('[DoorCNTCharacteristic Notify]:', data);
    updateCallback(data);
  }
});

