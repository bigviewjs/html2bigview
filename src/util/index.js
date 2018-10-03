const fs = require('fs')
const path = require('path')
const nunjucks = require('nunjucks')
const request = require('superagent')
const minify = require('html-minifier').minify

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

const renderJsTpl = (ctx, route, params) => {
  return new Promise(resolve => {
    ctx.render(path.join(__dirname, route), params, (err, html) => {
      if (err) {
        console.log(err)
        return
      }
      fs.writeFileSync(getProcessCwd(`./src/tpl/${params.name}/index.js`), html)
      resolve()
    })
  })
}

const enHance = (ctx) => {
  ctx.render = function (tpl, data, cb) {
    const env = nunjucks.configure('/', {
      tags: {
        commentStart: '<!--',
        commentEnd: '-->'
      }
    })

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

const requestHtml = (url, cb) => {
  request
    .get(url)
    .set('Content-Type', 'text/html; charset=UTF-8')
    .end((err, rep) => {
      if (err) {
        console.log(err)
        return
      }
      cb && cb(rep)
    })
}

const myMinify = (html) => {
  return minify(html, {
    removeTagWhitespace: true,
    removeEmptyAttributes: true,
    minifyJS: true,
    minifyCSS: true,
    removeComments: true,
    collapseWhitespace: true
  })
}
module.exports = {
  mkdirs,
  getProcessCwd,
  renderJsTpl,
  enHance,
  requestHtml,
  myMinify
}
