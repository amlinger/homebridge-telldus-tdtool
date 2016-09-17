'use strict'

const TDtool = require('./lib/tdtool')
const {
  TelldusSwitch,
  TelldusDimmer,
  TelldusThermometer,
} = require('./lib/telldus-accessory')

const modelToAssecoryMap = {
  'selflearning-switch':  TelldusSwitch,
  'codeswitch':           TelldusSwitch,
  'selflearning-dimmer':  TelldusDimmer,
  'temperature':          TelldusThermometer,
  'temperaturehumidity':  TelldusThermometer,
}

const githubRepo = 'https://github.com/amlinger/homebridge-telldus-tdtool'

const foundOfTypeString = (type, length) =>
  `Found ${length || 'no'} item${length != 1 ? 's' : ''} of type "${type}".`

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
    TDtool.listDevices().then(deviceCandidates => {
      const devices = deviceCandidates.filter(d => d.type === 'device')
      this.log(foundOfTypeString('device', devices.length))
      return devices
    }).then(devices => {
      return TDtool.listSensors().then(sensors => {
        this.log(foundOfTypeString('sensor', sensors.length))
        sensors.forEach((current, index) => {
          sensors[index].name = 'Thermometer'})
        return devices.concat(sensors)
      })
    }).then(accessories => {
      callback(accessories.map(data => {
        const Accessory = modelToAssecoryMap[data.model.split(':')[0]]

        if (Accessory === undefined) {
          this.log(
            `Model "${data.model.split(':')[0]}" is not supported, try ` +
            `[${Object.keys(modelToAssecoryMap).join(', ')}]. If you still` +
            `have not found what you're looking for, submit a pull ` + 
            `at ${githubRepo}`)
            return null
        }

        return new Accessory(data, this.log, this.homebridge, this.config)
      }).filter(
        accessory => accessory != null
      ))
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
