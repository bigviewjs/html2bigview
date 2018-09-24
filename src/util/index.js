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

<<<<<<< HEAD
module.exports = {
  mkdirs
=======
const getProcessCwd = (route) => {
  return path.join(process.cwd(), route)
}
module.exports = {
  mkdirs,
  getProcessCwd
>>>>>>> develop
}
