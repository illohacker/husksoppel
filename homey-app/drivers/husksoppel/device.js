'use strict';

const Homey = require('homey');

class HuskSoppelDevice extends Homey.Device {
  async onInit() {
    this.log(`HuskSøppel device initialized: ${this.getName()}`);

    this._lastTriggeredDate = null;
    this._lastTriggeredDays = null;

    // Start polling
    await this.pollData();
    this.startPolling();
  }

  startPolling() {
    const interval = (this.getSetting('pollInterval') || 60) * 60 * 1000;

    if (this._pollInterval) {
      this.homey.clearInterval(this._pollInterval);
    }

    this._pollInterval = this.homey.setInterval(() => {
      this.pollData();
    }, interval);
  }

  async pollData() {
    try {
      const addressId = this.getSetting('addressId');
      const addressText = this.getSetting('addressText');

      if (!addressId || !addressText) {
        this.log('No address configured');
        return;
      }

      const url = `https://husksoppel.vercel.app/api/homey?addressId=${encodeURIComponent(addressId)}&location=${encodeURIComponent(addressText)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.next) {
        this.log('No upcoming collections');
        return;
      }

      const { next } = data;
      const days = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
      const dateObj = new Date(next.isoDate);
      const dayName = days[dateObj.getDay()];

      // Format: "Mandag 28.3"
      const dateDisplay = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateObj.getDate()}.${dateObj.getMonth() + 1}`;

      // Update capabilities
      await this.setCapabilityValue('waste_next_date', dateDisplay).catch(this.error);
      await this.setCapabilityValue('waste_next_types', next.summary).catch(this.error);
      await this.setCapabilityValue('waste_days_until', next.daysUntil).catch(this.error);

      // Trigger flows (only once per date)
      const triggerKey = `${next.date}-${next.daysUntil}`;
      if (this._lastTriggeredDate !== triggerKey) {
        const tokens = { types: next.summary, date: next.date };

        if (next.daysUntil === 0) {
          this.homey.app.triggerCollectionToday(this, tokens);
          this.log('Triggered: collection today');
        }

        if (next.daysUntil === 1) {
          this.homey.app.triggerCollectionTomorrow(this, tokens);
          this.log('Triggered: collection tomorrow');
        }

        if (next.daysUntil >= 1 && next.daysUntil <= 7) {
          this.homey.app.triggerCollectionInDays(this, tokens, { days: next.daysUntil });
          this.log(`Triggered: collection in ${next.daysUntil} days`);
        }

        this._lastTriggeredDate = triggerKey;
      }

      this.log(`Updated: ${dateDisplay} - ${next.summary} (${next.daysUntil} days)`);

    } catch (err) {
      this.error('Poll failed:', err);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('pollInterval') || changedKeys.includes('addressId') || changedKeys.includes('addressText')) {
      this.startPolling();
      await this.pollData();
    }
  }

  onDeleted() {
    if (this._pollInterval) {
      this.homey.clearInterval(this._pollInterval);
    }
  }
}

module.exports = HuskSoppelDevice;
