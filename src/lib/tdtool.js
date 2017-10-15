'use strict'

const confParser = require('tellstick.conf-parser')

const LINE_DELIMETER = '\n'
const PAIR_DELIMETER = '\t'

const exec = require('child_process').exec

const execute = cmd => new Promise((resolve, reject) => {
  exec(cmd, (err, stdout, stderr) => err ? reject(stderr) : resolve(stdout))})

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
 * Wrapper for CMD interaction with
 * @type {Object}
 */
class TDtool {
  isInstalled() {
    return execute('command -v tdtool').then(res => {
      (res !== '') ? Promise.resolve() : Promise.reject(
        '"tdtool" does not seem to be installed, but is required by this plugin.')})
  }

  listDevices() {
    return this.isInstalled().then(() =>
      execute('tdtool --list-devices')
    ).then(deviceString => {
      return confParser.parse('/etc/tellstick.conf').then(conf => {
        return deviceStringToObjects(deviceString)
          .map(device => Object.assign(
            conf.devices.find(confDev => confDev.id === device.id), device))
      })
    })
  }

  listSensors() {
    return this.isInstalled().then(() =>
      execute('tdtool --list-sensors')
    ).then(deviceString =>
      deviceStringToObjects(deviceString))
  }

  device(id) {
    return this.listDevices().then(
      devices => devices.find(d => d.id === id))
  }

  sensor(id) {
    return this.listSensors().then(
      sensors => sensors.find(s => s.id === id))
  }

  run(cmd, target) {
    return this.isInstalled().then(() =>
      execute(`tdtool ${cmd} ${target}`))
  }

  /**
   * Shorthand methods for running a command on a Device with the given
   * Device ID.
   *
   * @param  {[type]} TDtool [description]
   * @param  {[type]} '--on' [description]
   * @return {[type]}        [description]
   */
  on(id) { return this.run('--on', id) }
  off(id) { return this.run('--off', id) }
  dim(level, id) {
    return this.isInstalled().then(() =>
      execute(`tdtool --dimlevel ${level} --dim ${id}`))
  }
}

module.exports = { TDtool }
