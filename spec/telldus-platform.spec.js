'use strict'

const proxyquire = require('proxyquire')

describe('test', () => {
  let instance, log, injector, homebridgeInjector, tdMocks

  const registerInjector = (mocks) => {
    homebridgeInjector = proxyquire('../src/index', mocks)

    log = jasmine.createSpy()
    homebridgeInjector({
      registerPlatform: (name, desc, inj) => {
        instance = new inj(log, {}, {
          hap: {
            Characteristic: null,
            Service: null,
          }
        })
      }
    })
  }

  it('should create a service when accessed by HomeBridge', () => {
    registerInjector({
      'tellstick-confparser': jasmine.createSpy(),
      './lib/tdtool': {
        listDevices: jasmine.createSpy().and.returnValue(null)
      }
    })
    expect(Object.keys(instance)).toEqual(['log', 'config', 'homebridge'])
  })

  describe('#accessories', () => {
    it('should log no found items.', done => {
      registerInjector({
        'tellstick-confparser': jasmine.createSpy(),
        './lib/tdtool': {
          listDevices: jasmine.createSpy().and.returnValue(Promise.resolve([]))
        }
      })

      instance.accessories(accessories => {
        expect(accessories).toEqual([])
        expect(log.calls.allArgs()[0][0]).toEqual('Loading devices...')
        expect(log.calls.allArgs()[1][0]).toEqual(
          'Found no items of type "device".')
        done()
      })
    })

    it('should only create accessories that are of type "device".', done => {
      const devices = [
        {type: 'device'},
        {type: 'not-a-device'},
      ]

      registerInjector({
        'tellstick-confparser': jasmine.createSpy(),
        './lib/tdtool': {
          listDevices: jasmine.createSpy().and.returnValue(
            Promise.resolve(devices)),
          device: jasmine.createSpy().and.callFake(id =>
            Promise.resolve(devices.find(d => d.id === id)))
        }
      })

      instance.accessories(accessories => {
        expect(log.calls.allArgs()[0][0]).toEqual('Loading devices...')
        expect(log.calls.allArgs()[1][0]).toEqual(
          'Found 1 item of type "device".')
        done()
      })
    })

    it('should create accessories when passed.', done => {
      const devices = [{
        id: 1,
        name: 'Lamp1',
        controller: 0,
        protocol: 'arctech',
        model: 'selflearning-switch:nexa',
        type: 'device',
        lastsentcommand: 'ON',
      }, {
        id: 2,
        name: 'Lamp2',
        controller: 0,
        protocol: 'arctech',
        model: 'selflearning-switch:nexa',
        type: 'device',
        lastsentcommand: 'ON',
      }]

      registerInjector({
        'tellstick-confparser': jasmine.createSpy(),
        './lib/tdtool': {
          listDevices: jasmine.createSpy().and.returnValue(
            Promise.resolve(devices)),
          device: jasmine.createSpy().and.callFake(id =>
            Promise.resolve(devices.find(d => d.id === id)))
        }
      })

      instance.accessories(accessories => {
        accessories.forEach(access => {
          expect(access.model).toBe('selflearning-switch')
          expect(access.manufacturer).toBe('nexa')
        })
        expect(log.calls.allArgs()[0][0]).toEqual('Loading devices...')
        expect(log.calls.allArgs()[1][0]).toEqual(
          'Found 2 items of type "device".')
        done()
      })
    })
  })
})
