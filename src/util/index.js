const fs = require('fs')
const path = require('path')
const nunjucks = require('nunjucks')

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

const getProcessCwd = (route) => {
  return path.join(process.cwd(), route)
}

const renderJsTpl = (ctx, route, name) => {
  return new Promise(resolve => {
    ctx.render(path.join(__dirname, route), {
      name: name
    }, (err, html) => {
      if (err) {
        console.log(err)
        return
      }
      fs.writeFileSync(getProcessCwd(`./src/tpl/${name}/index.js`), html)
      resolve()
    })
  })
}

const enHance = (ctx) => {
  ctx.render = function (tpl, data, cb) {
    const env = nunjucks.configure('/')
    if (/\.nj$/.test(tpl) || /\.html$/.test(tpl)) {
      env.render(tpl, data, (err, html) => {
        cb && cb(err, html)
      })
    } else {
      env.renderString(tpl, data, (err, html) => {
        cb(err, html)
      })
    }
  }

  ctx.complie = function (str) {
    const template = nunjucks.compile(str)
    return template
  }
}

const insertBigviewRuntime = (layout) => {
  const bodyIndex = layout.indexOf('</body>')
  layout = layout.substring(0, bodyIndex)
  layout += '<script src="//g.alicdn.com/ku/bigview.runtime/1.4.5/bigview.runtime.min.js"></script></body></html>'
  return layout
}

module.exports = {
  mkdirs,
  getProcessCwd,
  renderJsTpl,
  enHance,
  insertBigviewRuntime
}
