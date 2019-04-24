
var util = require('util');
var bleno = require('bleno');

var Descriptor = bleno.Descriptor;
var Characteristic = bleno.Characteristic;

// Primary service instance reference
var door_service;

var DoorRENCharacteristic = function(srv) {
  DoorRENCharacteristic.super_.call(this, {
    uuid: '8f3625e6-5f63-4bf8-872b-8786a911b620',
    properties: [ 'writeWithoutResponse' ]
  });

  door_service = srv;
};

util.inherits(DoorRENCharacteristic, Characteristic);

DoorRENCharacteristic.prototype.onWriteRequest =
function(data, offset, withoutResponse, callback) {
  var octets = new Uint8Array(data);
  var test = Buffer.from(data)
  console.log('Request to enter from ID:', test);// + u8AToHexString(octets));

  door_service.requestToEnter(data);

  callback(this.RESULT_SUCCESS);
};

module.exports = DoorRENCharacteristic;

