'use strict'

const TDtool = require('./tdtool')

// Convert 0-255 to 0-100
const bitsToPercentage = value => Math.round(value * 100 / 255)
// Convert 0-100 to 0-255
const percentageToBits = value => Math.round(value * 255 / 100)

/**
 * An Accessory convenience wrapper.
 */
class TelldusAccessory {

  /**
   * Inject everything used by the class. No the neatest solution, but nice for
   * testing purposes, and avoiding globals as we don't know anything about
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

    // Split manufacturer and model
    const modelPair = data.model ? data.model.split(':') : ['N/A', 'N/A']
    this.model = modelPair[0]
    this.manufacturer = modelPair[1]

    // Device log
    this.log = string => log(`[${this.name}]: ${string}`)
    this.Characteristic = homebridge.hap.Characteristic
    this.Service        = homebridge.hap.Service
  }

  /**
   * Get the state of this Accessory with the given Characteristic.
   *
   * @param  {hap.Characteristic} characteristic The desired Characteristic.
   * @param  {Function}           callback       To be invoked when result is
   *                                             obtained.
   * @param  {object}             context
   */
  getState(characteristic, callback, context) {
    if (characteristic.props.format != this.Characteristic.Formats.BOOL)
      callback('Only bool is supported')

    TDtool.device(this.id).then(device => {
      callback(null, device.lastsentcommand === 'ON')
    })
  }

  /**
   * Set the state of this Accessory with the given Characteristic.
   *
   * @param  {hap.Characteristic} characteristic The desired Characteristic.
   * @param  {*}                  value          The value to set,
   *                                             corresponding to the passed
   *                                             Characteristic
   * @param  {Function}           callback       To be invoked when result is
   *                                             obtained.
   * @param  {object}             context
   */
  setState(characteristic, value, callback, context) {
    this.log('Recieved set state request: ' + value)

    switch(characteristic.props.format) {
      case this.Characteristic.Formats.BOOL:
        (value ? TDtool.on(this.id) : TDtool.off(this.id)).then(out => {
          return out.endswith('Success') ? callback() : Promise.reject(out)


          // FIXME: This does not appear to actually be raising an error to
          //        Homebridge, check out http://goo.gl/RGuILo . Same as below.
        }, error => callback(new Error(error)))
        break
      case this.Characteristic.Formats.INT:
        TDtool.setDimLevel(value).then(() => TDtool.dim(this.id)).then(out => {
          return out.endswith('Success') ? callback() : Promise.reject(out)

          // FIXME: This does not appear to actually be raising an error to
          //        Homebridge, check out http://goo.gl/RGuILo . Same as above.
        }, error => callback(new Error(error)))
        break
      default:
        callback('Unsupported Characteristic')
        break
    }
  }

  /**
   * No action done at this moment.
   *
   * @param  {Function} callback Invoked when logging has been done.
   */
  identify(callback) {
    this.log('Identify called.');
    callback();
  }

  /**
   * Return the supported services by this Accessory.
   * @return {Array} An array of services supported by this accessory.
   */
  getServices() {
    return [this.getControllerService()]
  }

  /**
   * Fetches the controller service for this accessory, whtih
   * @return {[type]} [description]
   */
  getControllerService() {
    const homebridgeModel = {
      // Mapping from Telldus models to Homekit devices. Fetch the actual
      // characteristics and controllerService from the mapping.
      'selflearning-switch': {
        controllerService: new this.Service.Lightbulb(),
        characteristics: [this.Characteristic.On]
      },
      'codeswitch': {
        controllerService: new this.Service.Lightbulb(),
        characteristics: [this.Characteristic.On]
      },
      'selflearning-dimmer': {
        controllerService: new this.Service.Lightbulb(),
        characteristics: [
          this.Characteristic.On, this.Characteristic.Brightness]
      }
    }[this.model]

    // Use own getters and setters for the different characteristics.
    homebridgeModel.characteristics
      .map(ch => homebridgeModel.controllerService.getCharacteristic(ch))
      .forEach(characteristic => {
        characteristic.on('get', this.getState.bind(this, characteristic))
        characteristic.on('set', this.setState.bind(this, characteristic))
      })

    return homebridgeModel.controllerService;
  }
}

module.exports = TelldusAccessory
