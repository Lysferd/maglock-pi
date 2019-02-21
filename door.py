#!/usr/bin/env python3

try:
  from gi.repository import GObject
except ImportError:
  import gobject as GObject

import dbus
import array
from gpiozero import LED, Button
from gatt import Service, Characteristic, Descriptor

GATT_CHRC_IFACE = 'org.bluez.GattCharacteristic1'

class DoorService(Service):
    """
    MagLock Door Service Alpha Version
    """
    SERVICE_UUID = '3d22744e-38df-4a2d-bb2e-80f582f78784'

    def __init__(self, bus, index):
        Service.__init__(self, bus, index, self.SERVICE_UUID, True)

        self.contact_chrc = DoorContactCharacteristic(bus, 0, self)
        self.strike_chrc = DoorStrikeCharacteristic(bus, 1, self)
        self.request_to_enter_chrc = DoorRENCharacteristic(bus, 2, self)

        self.add_characteristic(self.contact_chrc)
        self.add_characteristic(self.strike_chrc)
        self.add_characteristic(self.request_to_enter_chrc)

        self.strike = True
        self.contact = True
        self.req = False

        self.timeout = 0

    """
    LOGIC:
        Normal state: STR ON, CON ON
        Upon REN: STR OFF, CON ON
        Door opens: STR ON, CON OFF
        Door closes: STR ON, CON ON
        Door is left unopen for 5s: STR ON, CON ON
    MAYBE
    """
    def locked(self):
        print("Service#locked")
        self.strike = True

    def unlocked(self):
        print("Service#unlocked")
        self.strike = False

    def closed(self):
        print("Service#closed")
        self.contact = True

    def opened(self):
        print("Service#opened")
        self.contact = False
        if self.req == True:
            self.disable_req()
        else:
            print("DOOR FORCED OPEN!!!")

    def request_to_enter(self):
        print("Service#REN")
        # Do not allow multiple reqs to overlap at service level
        if self.req == True:
            GObject.source_remove(self.timeout)
            self.timeout = 0

        self.req = True
        if self.contact == True:
            self.strike_chrc.unlock()
        self.timeout = GObject.timeout_add(5000, self.disable_req)

    def disable_req(self):
        if self.req == False:
            return False
        self.req = False
        self.strike_chrc.lock()
        return False
        

class DoorContactCharacteristic(Characteristic):
    """
    MagLock Door Contact: READ + NOTIFY
    """
    CHARACTERISTIC_UUID = 'e53a7a22-0850-48e5-9f25-5864e71eb00a'

    def update_status(self):
        # Update value and pring debug
        self.value = not self.button.is_pressed
        print('Contact status is: ' + repr(self.value))
        if self.value:
            self.closed()
            self.led.on()
        else:
            self.opened()
            self.led.off()

        # Notify only if enabled
        if self.notifying:
            self.notify_status()

        # Signal GObject to loop
        return True

    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, self.CHARACTERISTIC_UUID, ['read', 'notify'], service)

        # Instance variables:
        self.notifying = False
        self.button = Button(4)
        self.led = LED(14)
        self.value = self.button.is_pressed

        # Add descriptors:
        self.button.when_pressed = self.update_status
        self.button.when_released = self.update_status
        
        # Force initial update
        self.update_status()

    def closed(self):
        self.service.closed()

    def opened(self):
        self.service.opened()

    def notify_status(self):
        if not self.notifying:
            return
        self.PropertiesChanged(GATT_CHRC_IFACE, { 'Value': [self.value] }, [])

    def ReadValue(self, options):
        self.update_status()
        print('Door Contact Read: ' + repr(self.value))
        return [self.value]

    def StartNotify(self):
        if self.notifying:
            print('Already notifying, nothing to do')
            return
        print('Enabling Door Contact Characteristic notification')
        self.notifying = True
        self.notify_status()

    def StopNotify(self):
        if not self.notifying:
            print('Not notifying, nothing to do')
            return
        print('Disabling Door Contact Characteristic notification')
        self.notifying = False

class DoorStrikeCharacteristic(Characteristic):
    """
    MagLock Door Strike: READ + NOTIFY
    """
    CHARACTERISTIC_UUID = 'a1fd909e-b168-452a-99fe-621db9c0111a'

    def update_status(self):
        # Update value and pring debug
        print('Strike status is: ' + repr(self.value))
        if self.value:
            self.led.on()
        else:
            self.led.off()

        # Notify only if enabled
        if self.notifying:
            self.notify_status()

        # Signal GObject to loop
        return True

    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, self.CHARACTERISTIC_UUID, ['read', 'notify'], service)

        # Instance variables:
        self.notifying = False
        self.value = True
        self.led = LED(15)

        # Force initial update
        self.update_status()

    def unlock(self):
        print("Chrc#unlock")
        self.value = False
        self.service.unlocked()
        self.update_status()

    def lock(self):
        self.value = True
        self.service.locked()
        self.update_status()

    def notify_status(self):
        if not self.notifying:
            return
        self.PropertiesChanged(GATT_CHRC_IFACE, { 'Value': [self.value] }, [])

    def ReadValue(self, options):
        self.update_status()
        print('Door Strike Read: ' + repr(self.value))
        return [self.value]

    def StartNotify(self):
        if self.notifying:
            print('Already notifying, nothing to do')
            return
        print('Enabling Door Strike Characteristic notification')
        self.notifying = True
        self.notify_status()

    def StopNotify(self):
        if not self.notifying:
            print('Not notifying, nothing to do')
            return
        print('Disabling Door Strike Characteristic notification')
        self.notifying = False

class DoorRENCharacteristic(Characteristic):
    """
    MagLock Request to Enter: WRITE
    """
    CHARACTERISTIC_UUID = '8f3625e6-5f63-4bf8-872b-8786a911b620'

    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, self.CHARACTERISTIC_UUID, ['write'], service)

        # Instance variables:
        self.led = LED(18)
        self.button = Button(2)
        self.value = None
        self.timeout = 0
        self.button.when_pressed = self.simulate

    def simulate(self):
        self.WriteValue(None, [])

    def WriteValue(self, value, options):
        print('Request to Entry for ID: ' + repr(value))
        if self.timeout != 0:
            GObject.source_remove(self.timeout)
            self.timeout = 0
        self.led.on()
        self.value = value
        self.service.request_to_enter()
        self.timeout = GObject.timeout_add(5000, self.led.off)
        return [self.value]

