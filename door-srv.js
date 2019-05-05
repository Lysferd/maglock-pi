
const util = require('util');
const bleno = require('bleno');
const DDB = require('./aws-ddb');

const Gpio = require('onoff').Gpio;

const DoorRENCharacteristic = require('./door-ren-chr');
const DoorSTRCharacteristic = require('./door-str-chr');
const DoorCNTCharacteristic = require('./door-cnt-chr');

var DoorService = function() {
  this.ren_characteristic = new DoorRENCharacteristic(this);
  this.contact_characteristic = new DoorCNTCharacteristic(this);
  this.strike_characteristic = new DoorSTRCharacteristic(this, this.contact_characteristic._value);

  this.buzzer = new Gpio(21, 'out');
  this.rex = new Gpio(4, 'in', 'falling', {debounceTimeout: 10});
  this.rex.watch((err, value) => {
    if (err) throw err
    console.log('[DoorService Debug REX]');
    this.requestToEnter();
  });

  this.timeout = null;
  this.requested = false;

  DoorService.super_.call(this, {
    uuid: '3d22744e-38df-4a2d-bb2e-80f582f78784',
    characteristics: [
      this.ren_characteristic,
      this.strike_characteristic,
      this.contact_characteristic
    ]
  });
};

DoorService.prototype.requestToEnter = function(data) {
  if (typeof data === 'undefined')
    DDB.log('Request to enter received from button', 'event');
  else
    DDB.log(`Request to enter for ID ${data} received`, 'event');

  this.requested = true;
  this.strike_characteristic.unlock();
};

DoorService.prototype.doorOpened = function() {
  if (this.requested == false)
    this.alarm();
  else {
    console.log('[DoorService Door Opened]: Locking door');
    DDB.log('Door opened', 'event');
    this.timeout = setTimeout(this.alarm, 75000, this);
    this.strike_characteristic.lock();
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

