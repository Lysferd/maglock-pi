#!/usr/bin/env python3

import dbus
from gi.repository import GObject

from gpiozero import LED
from gatt import Service, Characteristic

GATT_CHRC_IFACE =    'org.bluez.GattCharacteristic1'

class BatteryService(Service):
    """
    Fake Battery service that emulates a draining battery.

    """
    BATTERY_UUID = '180f'

    def __init__(self, bus, index):
        Service.__init__(self, bus, index, self.BATTERY_UUID, True)
        self.add_characteristic(BatteryLevelCharacteristic(bus, 0, self))


class BatteryLevelCharacteristic(Characteristic):
    """
    Fake Battery Level characteristic. The battery level is drained by 2 points
    every 5 seconds.

    """
    UUID = '2a19'

    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, self.UUID, ['read', 'notify'], service)
        self.notifying = False
        self.battery_lvl = 100
        self.led = LED(15)
        GObject.timeout_add(5000, self.drain_battery)

    def notify_battery_level(self):
        if not self.notifying:
            return
        self.PropertiesChanged(GATT_CHRC_IFACE, { 'Value': [dbus.Byte(self.battery_lvl)] }, [])

    def drain_battery(self):
        if not self.notifying:
            return True
        if self.battery_lvl > 0:
            self.battery_lvl -= 2
            if self.battery_lvl <= 0:
                self.battery_lvl = 100
        print('Battery Level drained: ' + repr(self.battery_lvl))
        self.notify_battery_level()
        return True

    def ReadValue(self, options):
        print('Battery Level read: ' + repr(self.battery_lvl))
        return [dbus.Byte(self.battery_lvl)]

    def StartNotify(self):
        if self.notifying:
            print('Already notifying, nothing to do')
            return
        
        print('Enabling Battery Service notification')
        self.notifying = True
        self.notify_battery_level()
        self.led.on()

    def StopNotify(self):
        if not self.notifying:
            print('Not notifying, nothing to do')
            return

        print('Disabling Battery Service notification')
        self.notifying = False
        self.led.off()
