const fs = require('fs')
const path = require('path')

const sourceFile = path.resolve(__dirname, '../dist/index.umd.js')
const targetWebapp = path.resolve(__dirname, '../../webapp/public/static/embed.js')
const targetServer = path.resolve(__dirname, '../../server/static/embed.js')

if (!fs.existsSync(sourceFile)) {
  console.error(`Source file not found: ${sourceFile}`)
  process.exit(1)
}

fs.mkdirSync(path.dirname(targetWebapp), { recursive: true })
fs.copyFileSync(sourceFile, targetWebapp)
console.log(`Copied embed.js to ${targetWebapp}`)

if (fs.existsSync(path.dirname(targetServer))) {
  fs.copyFileSync(sourceFile, targetServer)
  console.log(`Copied embed.js to ${targetServer}`)
}
