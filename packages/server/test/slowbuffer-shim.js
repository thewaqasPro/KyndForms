const b = require('buffer')
b.SlowBuffer = b.SlowBuffer || function () {}
b.SlowBuffer.prototype = b.SlowBuffer.prototype || {}
