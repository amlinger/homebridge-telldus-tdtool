'use strict'

const confParser = require('tellstick.conf-parser')

const LINE_DELIMETER = '\n'
const PAIR_DELIMETER = '\t'

const exec = require('child_process').exec

const execute = cmd => new Promise((resolve, reject) => {
  exec(cmd, (err, stdout, stderr) => err ? reject(stderr) : resolve(stdout))})

/**
 * Accepts a device string, and returns a list of objects.
 *
 * The string is expected to have the following format
 * type=device    id=1    name=First Lamp      lastsentcommand=OFF
 * type=device    id=2    name=Second Lamp     lastsentcommand=OFF
 * type=device    id=3    name=Another thing   lastsentcommand=ON
 *
 * Although this is generalized to key-value pairs separated by '=', pairs
 * separated by tabs and objects separated by newlines.
 *
 * @param  {string} deviceString The string output from tdtool.
 * @return {List}                A list of objects found in the given string.
 */
const deviceStringToObjects = deviceString =>
  deviceString
    .split(LINE_DELIMETER)
    .map(line =>
      line.split(PAIR_DELIMETER).reduce((obj, unparsedPair) => {
        const pair = unparsedPair.split('=')
        if (pair[0])
          obj[pair[0]] = pair[0] === 'id' ? parseInt(pair[1]) : pair[1]
        return obj
      }, {}))
    .filter(device => !!device.id)


/**
 * Wrapper for command line interactions with the CLI tool tdtool,
 * provided as part of telldus-core.
 *
 * This can be used for listing what tdtool refers to as either sensors using
 * the TDtool#listSensors method, or devices using the TDtool#listDevices
 * method, respectively.
 *
 * A sensor is an object containing fields listed by tdtool --list-sensors.
 * A device is an object containing fields listed by tdtool --list-devices.
 *
 * @type {TDtool}
 */
class TDtool {
  constructor(log) {
    this.log = string => log(`[TDtool]: ${string}`)
  }

  /**
   * Verify that TDtool is installed on the system.
   *
   * This check is wrapped in a Promise, to be resolved if the system has got
   * tdtool installed, or reject with an error message otherwise. The method
   * used for this is:
   * ```
   * command -v tdtool
   * ```
   *
   * @return {Promise} Promise that will resolve if tdtool is installed on
   *         the system, and rejected otherwise.
   */
  isInstalled() {
    this.log('Checking whether TDtool is installed (command -v tdtool)...')
    return execute('command -v tdtool').then(res => {
      if (res != '') {
        this.log('"TDtool" is present on system.')
        Promise.resolve()
      } else {
        this.log('"tdtool" does not seem to be installed, but is required ' +
                 'by this plugin.')
        Promise.reject('Necessary dependency missing')
      }
    })
  }

  /**
   * Returns a list of all devices found using tdtool.
   *
   * For devices to be returned, they both need to be present
   * using `tdtool --list-devices`, and listed in '/etc/tellstick.conf'.
   * The file is parsed using 'tellstick.conf-parser'.
   *
   * @return {Promise} Promise that is resolved with the devices from
   *                   `tdtool --list-devices`. This is a list of
   *                   device objects with fields as listed by stdout,
   *                   augmented and merged with objects as found in
   *                   tellstick.conf.
   */
  listDevices() {
    return execute('tdtool --list-devices').then(deviceString => {
      const tdtoolDevices = deviceStringToObjects(deviceString)
      // TODO: Validate the resuls from this, and that the correct properties
      // are present.

      this.log('"tdtool --list-devices" lists ' +
               tdtoolDevices.map(d => `"${d.name}"`).join(', '))

      return confParser.parse('/etc/tellstick.conf').then(conf => {
        this.log('"/etc/tellstick.conf" lists ' +
                 conf.devices.map(d => `"${d.name}"`).join(', '))

        return tdtoolDevices
          .map(device => Object.assign(
            conf.devices.find(confDev => confDev.id === device.id), device))
      })
    })
  }

  /**
   * Lists sensors found by tdtool command.
   *
   * The main difference from listing devices is that this cannot be
   * controlled by anything, and are read-only. These are listed using
   *
   * @return {Promise} Promise that is resolved with the sensors from
   *                   `tdtool --list-sensors`. This is a list of
   *                   sensor objects with fields as listed by stdout.
   */
  listSensors() {
    return execute('tdtool --list-sensors').then(deviceString => {
      const tdtoolSensors = deviceStringToObjects(deviceString)
      this.log('"tdtool --list-sensors" lists ' +
               tdtoolSensors.map(d => `"${d.id}"`).join(', '))
      return tdtoolSensors
    })
  }

  /**
   * Finds the device with the given ID.
   *
   * Note that this uses listDevices under the hood, so each call to this
   * method is rather inefficient, and might be time-consuming.
   *
   * @param {any}      id ID for the device to return.
   * @return {Promise}    Promise that is resolved with the device object as
   *                      found in the list.
   */
  device(id) {
    return this.listDevices().then(
      devices => devices.find(d => d.id === id))
  }

  /**
   * Finds the sensor with the given ID.
   *
   * Note that this uses listSensors under the hood, so each call to this
   * method is rather inefficient, and might be time-consuming.
   *
   * @param {any}      id ID for the sensor to return.
   * @return {Promise}    Promise that is resolved with the sensor object as
   *                      found in the list.
   */
  sensor(id) {
    return this.listSensors().then(
      sensors => sensors.find(s => s.id === id))
  }

  /**
   * Run a command using TDtool CLI.
   *
   * @param  {string} cmd    The command to run on the target (Ex: '--on-).
   * @param  {any}    target The target to run the command on.
   * @return {Promise}       A Promise that when resolved, contains the stdout
   *                         response to the invoked command, or the stderr
   *                         output when rejected.
   */
  run(cmd, target) { return execute(`tdtool ${cmd} ${target}`) }

  /**
   * Shorthand method for invoking an on command on a device.
   *
   * @param  {int}     id ID of the sensor to invoke the on command for.
   * @return {Promise}    A Promise that when resolved, contains the stdout
   *                      response to the invoked command, or the stderr
   *                      output when rejected.
   */
  on(id) { return this.run('--on', id) }

  /**
   * Shorthand method for invoking an off command on a device.
   *
   * @param  {int}     id  ID of the sensor to invoke the off command for.
   * @return {Promise}     A Promise that when resolved, contains the stdout
   *                       response to the invoked command, or the stderr
   *                       output when rejected.
   */
  off(id) { return this.run('--off', id) }

  /**
   * Shorthand method for invoking a dim command on a device.
   *
   * @param  {int}     id    ID of the sensor to invoke the dim command for.
   * @param  {level}   level The level to dim to for the device with given ID.
   * @return {Promise}       A Promise that when resolved, contains the stdout
   *                         response to the invoked command, or the stderr
   *                         output when rejected.
   */
  dim(level, id) { return execute(`tdtool --dimlevel ${level} --dim ${id}`) }
}

module.exports = { TDtool }
