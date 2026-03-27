'use strict';

const Homey = require('homey');

class HuskSoppelApp extends Homey.App {
  async onInit() {
    this.log('HuskSøppel is running...');

    // Register flow triggers
    this._collectionTomorrowTrigger = this.homey.flow.getTriggerCard('collection-tomorrow');
    this._collectionTodayTrigger = this.homey.flow.getTriggerCard('collection-today');
    this._collectionInDaysTrigger = this.homey.flow.getTriggerCard('collection-in-days');

    this._collectionInDaysTrigger.registerRunListener(async (args, state) => {
      return args.days === state.days;
    });

    // Register flow conditions
    this._isCollectionTomorrow = this.homey.flow.getConditionCard('is-collection-tomorrow');
    this._isCollectionTomorrow.registerRunListener(async () => {
      const devices = this.homey.drivers.getDriver('husksoppel').getDevices();
      for (const device of devices) {
        const daysUntil = device.getCapabilityValue('waste_days_until');
        if (daysUntil === 1) return true;
      }
      return false;
    });

    this._isCollectionToday = this.homey.flow.getConditionCard('is-collection-today');
    this._isCollectionToday.registerRunListener(async () => {
      const devices = this.homey.drivers.getDriver('husksoppel').getDevices();
      for (const device of devices) {
        const daysUntil = device.getCapabilityValue('waste_days_until');
        if (daysUntil === 0) return true;
      }
      return false;
    });

    this._hasWasteType = this.homey.flow.getConditionCard('has-waste-type');
    this._hasWasteType.registerRunListener(async (args) => {
      const devices = this.homey.drivers.getDriver('husksoppel').getDevices();
      for (const device of devices) {
        const types = device.getCapabilityValue('waste_next_types') || '';
        return types.toLowerCase().includes(args.type.toLowerCase());
      }
      return false;
    });
  }

  triggerCollectionTomorrow(device, tokens) {
    this._collectionTomorrowTrigger.trigger(device, tokens).catch(this.error);
  }

  triggerCollectionToday(device, tokens) {
    this._collectionTodayTrigger.trigger(device, tokens).catch(this.error);
  }

  triggerCollectionInDays(device, tokens, state) {
    this._collectionInDaysTrigger.trigger(device, tokens, state).catch(this.error);
  }
}

module.exports = HuskSoppelApp;
