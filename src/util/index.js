const fs = require('fs')
const path = require('path')

const mkdirs = (route) => {
  if (fs.existsSync(route)) {
    return true
  }
  let parentRoute = path.join(route, '..')
  if (fs.existsSync(parentRoute)) {
    fs.mkdirSync(route)
    return true
  } else {
    mkdirs(parentRoute)
    mkdirs(route)
  }
}

module.exports = {
  mkdirs
}
