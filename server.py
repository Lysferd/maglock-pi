#!/usr/bin/env python3

import dbus
import dbus.mainloop.glib
from gi.repository import GObject
import sys
from random import randint

from advertisement import TestAdvertisement
from door import DoorService
#from heart import HeartRateService
#from battery import BatteryService
#from test import TestService

mainloop = None

BLUEZ_SERVICE_NAME = 'org.bluez'
GATT_MANAGER_IFACE = 'org.bluez.GattManager1'
DBUS_OM_IFACE =      'org.freedesktop.DBus.ObjectManager'
DBUS_PROP_IFACE =    'org.freedesktop.DBus.Properties'
#LE_ADVERTISEMENT_IFACE = 'org.bluez.LEAdvertisement1'
LE_ADVERTISING_MANAGER_IFACE = 'org.bluez.LEAdvertisingManager1'

class Application(dbus.service.Object):
    """
    org.bluez.GattApplication1 interface implementation
    """
    def __init__(self, bus, index):
        self.path = '/' + str(index)
        self.services = []
        dbus.service.Object.__init__(self, bus, self.path)
        self.add_service(DoorService(bus, 0))

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def add_service(self, service):
        self.services.append(service)

    @dbus.service.method(DBUS_OM_IFACE, out_signature='a{oa{sa{sv}}}')
    def GetManagedObjects(self):
        response = {}
        print('GetManagedObjects')

        for service in self.services:
            response[service.get_path()] = service.get_properties()
            print(service.get_path())
            chrcs = service.get_characteristics()
            for chrc in chrcs:
                response[chrc.get_path()] = chrc.get_properties()
                descs = chrc.get_descriptors()
                for desc in descs:
                    response[desc.get_path()] = desc.get_properties()

        return response

def register_app_cb():
    print('GATT application registered')


def register_app_error_cb(error):
    print('Failed to register application: ' + str(error))
    mainloop.quit()


def register_ad_cb():
    print('Advertisement registered')


def register_ad_error_cb(error):
    print('Failed to register advertisement: ' + str(error))
    mainloop.quit()


def find_le_adapter(bus):
    remote_om = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, '/'),
                               DBUS_OM_IFACE)
    objects = remote_om.GetManagedObjects()

    for o, props in objects.items():
        if LE_ADVERTISING_MANAGER_IFACE in props:
            return o

    return None

def find_gatt_adapter(bus):
    remote_om = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, '/'),
                               DBUS_OM_IFACE)
    objects = remote_om.GetManagedObjects()

    for o, props in objects.items():
        if GATT_MANAGER_IFACE in props.keys():
            return o

    return None

def main():
    global mainloop

    print(dir(Application))

    index = 0
    if len(sys.argv) > 1:
        index = int(sys.argv[1])
    print('Index is', index)

    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus()

    # LE Advertiser
    le_adapter = find_le_adapter(bus)
    if not le_adapter:
        print('LEAdvertisingManager1 interface not found')
        return

    adapter_props = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, le_adapter), "org.freedesktop.DBus.Properties");
    adapter_props.Set("org.bluez.Adapter1", "Powered", dbus.Boolean(1))
    ad_manager = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, le_adapter), LE_ADVERTISING_MANAGER_IFACE)
    test_advertisement = TestAdvertisement(bus, index)
    print('Registering Bluetooth LE advertiser: ' + test_advertisement.get_path())
    ad_manager.RegisterAdvertisement(test_advertisement.get_path(), {}, reply_handler=register_ad_cb, error_handler=register_ad_error_cb)

    # GATT Server
    gatt_adapter = find_gatt_adapter(bus)
    if not gatt_adapter:
        print('GattManager1 interface not found')
        return

    service_manager = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, gatt_adapter), GATT_MANAGER_IFACE)
    app = Application(bus, index)
    print('Registering GATT application: ' + gatt_adapter)
    service_manager.RegisterApplication(app.get_path(), {}, reply_handler=register_app_cb, error_handler=register_app_error_cb)

    mainloop = GObject.MainLoop()
    mainloop.run()

if __name__ == '__main__':
    main()
