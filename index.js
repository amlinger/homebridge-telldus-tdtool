'use strict'

const TelldusAccessory = require('./lib/telldus-accessory')
const TDtool           = require('./lib/tdtool')

/**
 * Platform wrapper that fetches the accessories connected to the
 * Tellstick via the CLI tool tdtool.
 */
class TelldusTDToolPlatform {
  constructor(log, config, homebridge) {
    this.log = log
    this.config = config
    this.homebridge = homebridge
  }

  accessories(callback) {
    this.log('Loading devices...')
    TDtool.listDevices().then(devices => {
      devices = devices.filter(d => d.type === 'device')

      const len = devices.length
      this.log(
        `Found ${len || 'no'} item${len != 1 ? 's' : ''} of type "device".`
      )

      callback(devices.map(data =>
        new TelldusAccessory(data, this.log, this.homebridge, this.config)))
    }, error => callback(new Error(error)))
  }
}

/*
 * Register the Telldus tdtool platform as this module.
 */
module.exports = homebridge => {
  homebridge.registerPlatform(
    'homebridge-telldus-tdtool', "Telldus-TD-Tool", TelldusTDToolPlatform)
};
