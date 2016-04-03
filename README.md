# Homebridge Telldus tdtool
A Homebridge plugin for Tellstick without Live, interfaced with the CLI tool tdtool.

## Usage

Install this plugin globally by typing the following.
```sh
$ npm install -g homebridge-telldus-tdtool
```

Then include 
```json
{
  "platform" : "Telldus-TD-Tool",
  "name" : "Telldus-TD-Tool"
}
```

in your list of platforms, to make it look like the following:
```json 
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "platforms": [{
    "platform" : "Telldus-TD-Tool",
    "name" : "Telldus-TD-Tool"
  }]
}
```
