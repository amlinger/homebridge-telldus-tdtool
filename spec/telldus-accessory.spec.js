'use strict'

const proxyquire = require('proxyquire')

describe('test', () => {
  let instance, log, injector, homebridgeInjector, tdMocks

  const registerInjector = (mocks) => {
    homebridgeInjector = proxyquire('../index', mocks)

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
      './td-tool': {
        listDevices: jasmine.createSpy().and.returnValue(null)
      }
    })
    expect(Object.keys(instance)).toEqual(['log', 'config', 'homebridge'])
  })

  describe('#accessories', () => {
    it('should log no found items.', done => {
      registerInjector({
        'tellstick-confparser': jasmine.createSpy(),
        './td-tool': {
          listDevices: jasmine.createSpy().and.returnValue(Promise.resolve([]))
        }
      })

      instance.accessories(accessories => {
        expect(accessories).toEqual([])
        expect(log.calls.allArgs()[0][0]).toEqual('Loading devices...')
        expect(log.calls.allArgs()[1][0]).toEqual(
          'Found 0 items of type "device".')
        done()
      })
    })

    it('should create accessories when passed.', done => {
      const devices = [{
        id: 1,
        name: 'Livingroom:lamps-window',
        controller: 0,
        protocol: 'arctech',
        model: 'selflearning-switch:nexa',
        type: 'device',
        lastsentcommand: 'ON',
      }, {
        id: 2,
        name: 'Livingroom:lamps-cabinet',
        controller: 0,
        protocol: 'arctech',
        model: 'selflearning-switch:nexa',
        type: 'device',
        lastsentcommand: 'ON',
      }]

      registerInjector({
        'tellstick-confparser': jasmine.createSpy(),
        './td-tool': {
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
