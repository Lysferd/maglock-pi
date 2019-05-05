
// Bluetooth
const bleno = require('bleno');
const DoorService = require('./services/door');
const HardwareService = require('./services/hardware');

// AWS
const DDB = require('./aws-ddb');

// GPIO
const Gpio = require('onoff').Gpio;
const connection_led = new Gpio(12, 'out');
const advertising_led = new Gpio(20, 'out');

bleno.on('stateChange', function (state) {
	console.log('on -> stateChange: ' + state);
  DDB.begin()

	if (state === 'poweredOn') {
    bleno.startAdvertising('MagDoor 2', ['3d22']);
	} else {
		bleno.stopAdvertising();
	}
});

bleno.on('advertisingStart', function (error) {
	console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));
  if (error) throw error

  DDB.log('Board started advertising', 'debug');
  advertising_led.writeSync(1);

  bleno.setServices([
    new DoorService(),
    new HardwareService()
  ]);
});

bleno.on('advertisingStop', function (error) {
	console.log('on -> advertisingStop: ' + (error ? 'error ' + error : 'success'));

  DDB.log('Board stopped advertising', 'debug');
  advertising_led.writeSync(0);
});

bleno.on('servicesSet', function (error) {
	console.log('on -> servicesSet: ' + (error ? 'error ' + error : 'success'));
});

bleno.on('accept', function (clientAddress) {
	console.log('on -> accept, client: ' + clientAddress);

  DDB.log(`Board accepted connection with ${clientAddress}`, 'debug');
  connection_led.writeSync(1);
});

bleno.on('disconnect', function (clientAddress) {
	console.log("Disconnected from address: " + clientAddress);

  DDB.log(`Board disconnected from ${clientAddress}`, 'debug');
  connection_led.writeSync(0);
});

