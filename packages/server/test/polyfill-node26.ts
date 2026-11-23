const bufferMod = require('buffer')
if (!bufferMod.SlowBuffer) {
  bufferMod.SlowBuffer = Buffer
}
if (typeof (global as any).SlowBuffer === 'undefined') {
  ;(global as any).SlowBuffer = Buffer
}
