
var util = require('util');
var bleno = require('bleno');
var events = require('events');

function Door() {
  // Initialize Door.js
  events.EventEmitter.call(this);
}

util.inherits(Door, events.EventEmitter);

Door.prototype.request = function(data) {
  // Logic for request to enter.
  console.log('Request called with data:' , data);
  this.emit('strike', data);
}

module.exports.Door = Door;

