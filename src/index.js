'use strict'

const {TDtool} = require('./lib/tdtool')
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

const foundOfTypeString = (type, length, source) =>
  `Found ${length || 'no'} item${length != 1 ? 's' : ''} of type "${type}"` +
  ` from "${source}".`

/**
 * Platform wrapper that fetches the accessories connected to the
 * Tellstick via the CLI tool tdtool.
 */
class TelldusTDToolPlatform {
  constructor(log, config, homebridge) {
    this.log = log
    this.config = config
    this.homebridge = homebridge
    this.tdTool = new TDtool()
  }

  accessories(callback) {
    this.log('Loading devices...')
    this.tdTool.listDevices().then(deviceCandidates => {
      const devices = deviceCandidates.filter(d => d.type === 'device')
      this.log(foundOfTypeString(
            'device', devices.length, 'tdtool --list-devices'))
      return devices
    }).then(devices => {
      if (this.config.sensors !== undefined && this.config.sensors.length > 0) {
        this.log(foundOfTypeString(
              'sensor', this.config.sensors.length, 'config.json'))
        this.config.sensors.forEach((current, index) => {
          if (this.config.sensors[index].name === undefined) {
            this.config.sensors[index].name = `Sensor ${current.id}`
          }
        })
        return devices.concat(this.config.sensors)
      } else {
        return this.tdTool.listSensors().then(sensors => {
          this.log(foundOfTypeString('sensor', sensors.length,
                'tdtool --list-sensors'))
          sensors.forEach((current, index) => {
            sensors[index].name = `Thermometer ${current.id}`
          })
          return devices.concat(sensors)
        })
      }
    }).then(accessories => {
      callback(accessories.map(data => {
        const Accessory = modelToAccessoryMap[data.model.split(':')[0]]

        if (Accessory === undefined) {
          this.log(
            `Model "${data.model.split(':')[0]}" is not supported, try ` +
            `[${Object.keys(modelToAccessoryMap).join(', ')}]. If you still` +
            'have not found what you\'re looking for, submit a pull ' +
            `at ${githubRepo}`)
          return null
        }

        return new Accessory(data, this.log, this.tdTool, this.homebridge, this.config)
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
    'homebridge-telldus-tdtool', 'Telldus-TD-Tool', TelldusTDToolPlatform)
}
