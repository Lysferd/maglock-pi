
const util = require('util');
const bleno = require('bleno');
const DDB = require('../aws-ddb');

const Gpio = require('onoff').Gpio;

const DoorRequestCharacteristic = require('./characteristics/request');
const DoorStrikeCharacteristic = require('./characteristics/strike');
const DoorContactCharacteristic = require('./characteristics/contact');

var DoorService = function() {
  this.buzzer = new Gpio(21, 'out');
  this.rex = new Gpio(4, 'in', 'falling', {debounceTimeout: 5});
  this.rex.watch((err, value) => {
    if (err) throw err
    console.log('[DoorService Debug REX]');
    this.requestToEnter();
  });

  this.timeout = null;
  this.requested = false;

  this.request = new DoorRequestCharacteristic(this)
  this.contact = new DoorContactCharacteristic(this)
  this.strike = new DoorStrikeCharacteristic(this)

  DoorService.super_.call(this, {
    uuid: '3d22744e-38df-4a2d-bb2e-80f582f78784',
    characteristics: [ this.request, this.contact, this.strike ]
  });
};

DoorService.prototype.requestToEnter = function(data) {
  if (typeof data === 'undefined')
    DDB.log('Request to enter received from button', 'event');
  else
    DDB.log(`Request to enter for ID ${data} received`, 'event');

  this.requested = true;
  this.strike.unlock();
};

DoorService.prototype.doorOpened = function() {
  if (this.requested == false)
    this.alarm();
  else {
    console.log('[DoorService Door Opened]: Locking door');
    DDB.log('Door opened', 'event');
    this.timeout = setTimeout(this.alarm, 75000, this);
    this.strike.lock();
  }
};

DoorService.prototype.doorClosed = function() {
  this.buzzer.writeSync(0);
  clearTimeout(this.timeout);
  if (this.requested == false) {
    console.log('[DoorService Door Forced Restored]');
    DDB.log('Door forced open restored', 'event');
  }
  else {
    this.requested = false;
    console.log('[DoorService Door Closed]');
    DDB.log('Door closed', 'event');
  }
};

DoorService.prototype.alarm = function(ref) {
  console.log('[DoorService Door Forced Open]');

  if (typeof ref === 'undefined') ref = this
  ref.buzzer.writeSync(1);
  clearTimeout(ref.timeout);

  DDB.log('Door forced open', 'alarm');
};


util.inherits(DoorService, bleno.PrimaryService);

module.exports = DoorService;

