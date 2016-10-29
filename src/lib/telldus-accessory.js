'use strict'

const TDtool = require('./tdtool')

// Convert 0-255 to 0-100
const bitsToPercentage = value => Math.round(value * 100 / 255)
// Convert 0-100 to 0-255
const percentageToBits = value => Math.round(value * 255 / 100)

/**
 * A Telldus Accessory convenience wrapper.
 *
 * This is meant to be the abstract base class for telldus accessories, both
 * for both devices and sensors. To extend this with new sensor types, a
 * getServices() method needs to be included. For examples of this, have a
 * a look below.
 */
class TelldusAccessory {

  /**
   * Setup data for accessory, and inject everything used by the class.
   *
   * Dependency injection is used here for easier testing, and avoiding 
   * global imports at the top of the file as we don't know anything about
   * Service, Characteristic and other Homebridge things that are injected
   * into exported provider function.
   *
   * @param  {object}  data       The object representation of the device.
   * @param  {hap.Log} log        The log to use for logging.
   * @param  {API}     homebridge The homebridge API, with HAP embedded
   * @param  {object}  config     Configuration object passed on from initial
   *                              instantiation.
   */
  constructor(data, log, homebridge, config) {
    this.data = data
    this.name = data.name
    this.id = data.id

    // Split manufacturer and model, which could be defined in the tellstick
    // configuration file as model:manufacturer. If not, fallback to use
    // "N/A" as manufacturer.
    const modelPair = data.model ? data.model.split(':') : [data.model, 'N/A']
    this.model = modelPair[0]
    this.manufacturer = modelPair[1]

    // Device log
    this.log = string => log(`[${this.name}]: ${string}`)
    this.Characteristic = homebridge.hap.Characteristic
    this.Service        = homebridge.hap.Service
  }

  /**
   * This is a noop action by default, but make sure to log that's been 
   * called.
   *
   * @param  {Function} callback Invoked when logging has been done.
   */
  identify(callback) {
    this.log('Identify called.')
    callback()
  }
}

/**
 * Wrapper for Telldus switches.
 *
 * These can be turned on and off, so it accepts a binary input when setting.
 * This is at the moment represented by a Lightbulb controller service.
 */
class TelldusSwitch extends TelldusAccessory {

  /**
   * Return the last known state of the telldus device, which could either
   * be ON or OFF. This is translated to a boolean value, that is returned to
   * the callback.
   *
   * @param  {Function}           callback       To be invoked when result is
   *                                             obtained.
   * @param  {object}             context
   */
  getState(callback, context) {
    TDtool.device(this.id).then(device => {
      // For this to be applicable for the dimmer as well as the switches, it
      // is crucial that we are comparing with OFF and not with ON. This is
      // because when OFF is the last sent command, the device is actually
      // off, but lastsentcommand could take other values when being on,
      // such as DIMMED in the case when a device has been dimmed.
      callback(null, device.lastsentcommand != 'OFF')
    })
  }

  /**
   * Set the state of this Accessory. This accepts a value that is either
   * true or false, for turning it on or off.
   *
   * @param  {*}                  value          The value to set,
   *                                             corresponding to the passed
   *                                             Characteristic
   * @param  {Function}           callback       To be invoked when result is
   *                                             obtained.
   * @param  {object}             context
   */
  setState(value, callback, context) {
    this.log(`Recieved set state request: [${value ? 'on' : 'off'}]`)

    TDtool[value ? 'on' : 'off'](this.id).then(out => {
      return out.indexOf('Success') > -1 ? callback() : Promise.reject(out)

      // FIXME: This does not appear to actually be raising an error to
      //        Homebridge, check out http://goo.gl/RGuILo . Same as below.
    }, error => callback(new Error(error)))
  }

   /**
   * Return the supported services by this Accessory. This supports
   * turning the device in and off, and binds the methods for that
   * accordningly.
   *
   * @return {Array} An array of services supported by this accessory.
   */
  getServices() {
    this.log('getServices called')
    const controllerService = new this.Service.Lightbulb()

    controllerService.getCharacteristic(this.Characteristic.On)
      .on('get', this.getState.bind(this))
      .on('set', this.setState.bind(this))

    return [controllerService]
  }
}

/**
 * Wrapper for Telldus dimmers.
 *
 * This share the properties of Telldus switches, and can be turned on and
 * of, as well as set the brightness. This therefore adds the characateristic
 * for brightness, and the appropriate getters and setters for it.
 */
class TelldusDimmer extends TelldusSwitch {

  /**
   * Return the last known state of the telldus device, which could either
   * be ON or OFF, or DIMMED. When it is dimmed, the dimlevel is present
   * and that could be used for 
   *
   * @param  {Function}           callback       To be invoked when result is
   *                                             obtained.
   * @param  {object}             context
   */
  getDimLevel(callback, context) {
    this.log('getDimLevel called')
    TDtool.device(this.id).then(device => {
      if (device.dimlevel)
        return callback(null, bitsToPercentage(parseInt(device.dimlevel)))
      callback(null, device.lastsentcommand === 'ON' ? 100 : 0)
    })

  }

  /**
   * Set the state of this Accessory to the given dim level. This is a value
   * given between 0 and 100 from Homebridge, that's translated to a value
   * between 0 and 255 that Telldus prefers.
   *
   * @param  {*}                  value          The value to set,
   *                                             corresponding to the passed
   *                                             Characteristic
   * @param  {Function}           callback       To be invoked when result is
   *                                             obtained.
   * @param  {object}             context
   */
  setDimLevel(value, callback, context) {
    TDtool.dim(percentageToBits(value), this.id).then(out => {
      return out.indexOf('Success') > -1 ? callback() : Promise.reject(out)

    // FIXME: This does not appear to actually be raising an error to
    //        Homebridge, check out http://goo.gl/RGuILo . Same as above.
    }, error => callback(new Error(error)))
  }

  /**
   * Return the supported services by this Accessory. This extends what's
   * been supported by the TelldusSwitch class, and adds a brightness
   * Characteristic, making it possible to set the brightness of the device.
   *
   * @return {Array} An array of services supported by this accessory.
   */
  getServices() {
    const controllerService= super.getServices()[0]

    controllerService.getCharacteristic(this.Characteristic.Brightness)
      .on('get', this.getDimLevel.bind(this))
      .on('set', this.setDimLevel.bind(this))

    return [controllerService]
  }
}

/**
 * Wrapper for Telldus hygrometers.
 *
 * This is a sensor, and only have the getting possibility of the value.
 */
class TelldusHygrometer extends TelldusAccessory {

  /**
   * Fetches the humidity in the air from the sensor. Accepts a callback
   * method and returns the value to that method.
   *
   * @param  {Function}           callback       To be invoked when result is
   *                                             obtained.
   * @param  {object}             context
   */
  getHumidity(callback, context) {
    this.log('Checking humidity...')
    TDtool.sensor(this.id, this.log).then(s => {
      if (s === undefined) {
        callback(true, null)
      } else {
        this.log(`Found humidity ${s.humidity}%`)
        callback(null, parseFloat(s.humidity))
      }
    })
  }

  /**
   * Return the supported services by this Accessory. This only supports
   * fetching of the humidity.
   *
   * @return {Array} An array of services supported by this accessory.
   */
  getServices() {
    const controllerService = new this.Service.HumiditySensor()

    controllerService.getCharacteristic(
      this.Characteristic.CurrentRelativeHumidity
    ) .on('get', this.getHumidity.bind(this))

    return [controllerService]
  }
}

/**
 * Wrapper for Telldus thermometer.
 *
 * This is a sensor, and only have the getting possibility of the value.
 */
class TelldusThermometer extends TelldusAccessory {

  /**
   * Accepts a callback method, and returns the unit of measurement for
   * the temperature. Is currently always set to Celcius.
   */
  getTemperatureUnits(callback) {
    this.log("Getting temperature units")

    // 1 = F and 0 = C
    callback (null, 0)
  }

  /**
   * Return the state of the telldus device, which is done by issuing
   * list-sensors with tdtool.
   *
   * @param  {Function}           callback       To be invoked when result is
   *                                             obtained.
   * @param  {object}             context
   */
  getTemperature(callback, context) {
    this.log(`Checking temperature...`)
    TDtool.sensor(this.id, this.log).then(s => {
      if (s === undefined) {
        callback(true, null)
      } else {
        this.log(`Found temperature ${s.temperature}`)
        callback(null, parseFloat(s.temperature))
      }
    })
  }

  /**
   * Return the supported services by this Accessory. This only supports
   * fetching of the temperature.
   *
   * Homebridges default minValue is 0, which can't handle negative temperatures.
   * We'll set it to -50 which should cover most usecases.
   *
   * @return {Array} An array of services supported by this accessory.
   */
  getServices() {
    const controllerService = new this.Service.TemperatureSensor()

    controllerService.getCharacteristic(
      this.Characteristic.CurrentTemperature
    ).setProps(
      { minValue: -50 }
    ).on('get', this.getTemperature.bind(this))

    return [controllerService]
  }
}

/**
 * Wrapper for Telldus thermometer and hygrometer.
 *
 * This is a sensor, and only have the getting possibility of the values.
 * It shares the same controller service as the Telldus Thermometer, and
 * adds a controller service or the Hygrometer.
 */
class TelldusThermometerHygrometer extends TelldusThermometer {

  /**
   * Return the state of the telldus device, which is done by issuing
   * list-sensors with tdtool.
   *
   * @param  {Function}           callback       To be invoked when result is
   *                                             obtained.
   * @param  {object}             context
   */
  getHumidity(callback, context) {
    this.log('Checking humidity...')
    TDtool.sensor(this.id, this.log).then(s => {
      if (s === undefined) {
        callback(true, null)
      } else {
        this.log(`Found humidity ${s.humidity}%`)
        callback(null, parseFloat(s.humidity))
      }
    })
  }

  /**
   * Return the supported services by this Accessory. This only supports
   * fetching of the temperature, as well as the humidity.
   *
   * @return {Array} An array of services supported by this accessory.
   */
  getServices() {
    const thermoServices = super.getServices(),
      hygroSensor = new this.Service.HumiditySensor()

    hygroSensor.getCharacteristic(
      this.Characteristic.CurrentRelativeHumidity
    ) .on('get', this.getHumidity.bind(this))

    return thermoServices.concat([hygroSensor])
  }
}

module.exports = {
  TelldusAccessory,
  TelldusSwitch,
  TelldusDimmer,
  TelldusHygrometer,
  TelldusThermometer,
  TelldusThermometerHygrometer,
}

