'use strict'

const BigView = require('bigview')
const request = require('superagent')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const { mkdirs, getProcessCwd } = require('./util')
const nunjucks = require('nunjucks')

async function html2Bigvew (ctx, url) {
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

  const bigView = new BigView(ctx)

  if (url) {
    return new Promise(resolve => {
      request
        .get(url)
        .set('Content-Type', 'text/html; charset=UTF-8')
        .end(async (err, rep) => {
          if (err) {
            console.log(err)
            return
          }
          let html = rep.text
          let layout
          let $ = cheerio.load(html, {decodeEntities: false}) // 关闭html实体编码转换
          const renderJsTpl = (route, name) => {
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

          if ($('#bp-main').length !== 0) {
            // 爬取bp-main
            let bpMain = $('#bp-main').html()
            mkdirs(path.join(getProcessCwd('./src/tpl/bp-main')))
            fs.writeFileSync(getProcessCwd('./src/tpl/bp-main/index.nj'), bpMain)
            await renderJsTpl('./jstpl/mainjstpl.nj', 'bp-main')
            const mainPageLet = require(getProcessCwd('./src/tpl/bp-main/index.js'))
            bigView.main = mainPageLet
            $('#bp-main').empty()
          }

          let allBlglet = $('.biglet')
          for (let i = 1; i <= allBlglet.length; i++) {
            // 爬取biglet
            let biglet = $(`#biglet_${i}`).html()
            mkdirs(getProcessCwd(`./src/tpl/biglet_${i}`))
            fs.writeFileSync(getProcessCwd(`./src/tpl/biglet_${i}/index.nj`), biglet)
            await renderJsTpl('./jstpl/bigletchildren.nj', `biglet_${i}`)
            bigView.add(require(getProcessCwd(`./src/tpl/biglet_${i}`)))
            $(`#biglet_${i}`).empty()
          }
          // 爬取layout
          layout = $.html('html')
          mkdirs(getProcessCwd('./src/tpl/bp-layout'))
          fs.writeFileSync(getProcessCwd(`./src/tpl/bp-layout/index.nj`), layout)

          await renderJsTpl('./jstpl/layoutjstpl.nj', 'bp-layout')

          // set layout
          bigView.layout = require(getProcessCwd('./src/tpl/bp-layout'))

          // you can custom bigView dataStore
          bigView.dataStore = {}

          // bigView.mode = 'pipeline'
          await bigView.start()
          resolve()
        })
    })
  }
}

module.exports = html2Bigvew
