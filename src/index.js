'use strict'

const TDtool = require('./lib/tdtool')
const {
  TelldusSwitch,
  TelldusDimmer,
  TelldusHygrometer,
  TelldusThermometer,
  TelldusThermometerHygrometer,
} = require('./lib/telldus-accessory')

const modelToAccessoryMap = {
  'selflearning-switch':  TelldusSwitch,
  'codeswitch':           TelldusSwitch,
  'selflearning-dimmer':  TelldusDimmer,
  'humidity':             TelldusHygrometer,
  'temperature':          TelldusThermometer,
  'temperaturehumidity':  TelldusThermometerHygrometer,
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
        sensors.forEach((current, index) => {sensors[index].name = `Thermometer ${current.id}`})
        return devices.concat(sensors)
      })
    }).then(accessories => {
      callback(accessories.map(data => {
        let Accessory = modelToAccessoryMap[data.model.split(':')[0]];
        // Some ESIC thermometers wrongly identifies themselves as temperaturehumidity and keeps sending 0% humidity.
        // We identify them by having humidity at zero, and override their type to avoid false sensors in homekit.
        if (Accessory === TelldusThermometerHygrometer && parseFloat(data.humidity) < 1) {
          Accessory = TelldusThermometer;
        }

        if (Accessory === undefined) {
          this.log(
            `Model "${data.model.split(':')[0]}" is not supported, try ` +
            `[${Object.keys(modelToAccessoryMap).join(', ')}]. If you still` +
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

/**
 * Register the Telldus tdtool platform as this module.
 */
module.exports = homebridge => {
  homebridge.registerPlatform(
    'homebridge-telldus-tdtool', "Telldus-TD-Tool", TelldusTDToolPlatform)
};
