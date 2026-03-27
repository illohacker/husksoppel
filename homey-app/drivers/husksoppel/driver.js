'use strict';

const Homey = require('homey');

class HuskSoppelDriver extends Homey.Driver {
  async onInit() {
    this.log('HuskSøppel driver initialized');
  }

  async onPairListDevices() {
    return [];
  }

  async onPair(session) {
    let addressId = '';
    let addressText = '';

    session.setHandler('login', async (data) => {
      addressId = data.username.trim();
      addressText = data.password.trim();

      if (!addressId || !addressText) {
        throw new Error('Both Address ID and Address text are required');
      }

      // Validate by fetching data
      try {
        const url = `https://husksoppel.vercel.app/api/homey?addressId=${encodeURIComponent(addressId)}&location=${encodeURIComponent(addressText)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.next) {
          throw new Error('No upcoming collections found for this address');
        }

        return true;
      } catch (err) {
        throw new Error(`Could not verify address: ${err.message}`);
      }
    });

    session.setHandler('list_devices', async () => {
      const shortAddress = addressText.split(',')[0] || addressText;
      return [
        {
          name: `Søppel: ${shortAddress}`,
          data: {
            id: `husksoppel-${addressId}`,
          },
          settings: {
            addressId,
            addressText,
            pollInterval: 60,
          },
        },
      ];
    });
  }
}

module.exports = HuskSoppelDriver;
