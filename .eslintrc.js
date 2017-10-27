module.exports = {
    "env": {
        "node": true,
        "jasmine": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "never"
        ],
        "no-unused-vars": [
            "error",
            { "vars": "all", "args": "none" }
        ],
        "max-len": [
          "error",
          100
        ],
        "no-trailing-spaces": "error"
    }
};
