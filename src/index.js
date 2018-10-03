'use strict'

const BigView = require('bigview')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const { mkdirs, getProcessCwd, renderJsTpl, enHance, requestHtml, myMinify } = require('./util')

async function html2Bigvew (ctx, url, options = {redisClient: false, zip: true, headJs: []}) {
  const redisClient = options.redisClient
  enHance(ctx) // 给ctx增加渲染模版功能
  const bigView = new BigView(ctx)
  ctx.set('Content-Type', 'text/html; charset=UTF-8')
  const mainFunc = async (html) => {
    let $ = cheerio.load(html, {decodeEntities: false}) // 关闭html实体编码转换
    if ($('#bp-main').length !== 0) {
      // 爬取bp-main 是否压缩
      const bpMain = options.zip === true ? myMinify($('#bp-main').html()) : $('#bp-main').html()

      if (!fs.existsSync(getProcessCwd('./src/tpl/bp-main/index.js')) || global.refresh) {
        mkdirs(path.join(getProcessCwd('./src/tpl/bp-main')))
        fs.writeFileSync(getProcessCwd('./src/tpl/bp-main/index.nj'), bpMain)
        await renderJsTpl(ctx, '../jstpl/mainjstpl.nj', {
          name: 'bp-main'
        })
        delete require.cache[getProcessCwd('./src/tpl/bp-main/index.js')] // 清空缓存
      }
      const mainPageLet = require(getProcessCwd('./src/tpl/bp-main/index.js'))
      bigView.main = mainPageLet
      $('#bp-main').empty()
    }

    let allBlglet = $('.biglet')
    // 获取页面所有脚本文件，并且把加载过程放入某个pagelet，避免阻塞layuot和bpmain的渲染
    const re = /\/\/(.*)?\.js$/
    let scripts = $('script').filter((index, element) => {
      // 只匹配src为js文件的脚本，且js不需要放在head头部
      if (element.attribs.src) {
        return re.test(element.attribs.src) && (options.headJs.indexOf(element.attribs.src) === -1)
      }
      return false
    })
    scripts.remove() // 从layout中移除脚本文件
    let jsArr = []
    scripts.map((index, item) => {
      jsArr.push(item.attribs.src)
    })
    jsArr = JSON.stringify(jsArr)

    for (let i = 1; i <= allBlglet.length; i++) {
      // 爬取biglet
      const biglet = options.zip === true ? myMinify($(`#biglet_${i}`).html()) : $(`#biglet_${i}`).html()

      if (!fs.existsSync(getProcessCwd(`./src/tpl/biglet_${i}`)) || global.refresh) {
        mkdirs(getProcessCwd(`./src/tpl/biglet_${i}`))
        fs.writeFileSync(getProcessCwd(`./src/tpl/biglet_${i}/index.nj`), biglet)
        await renderJsTpl(ctx, '../jstpl/bigletchildren.nj', {
          name: `biglet_${i}`,
          js: i === allBlglet.length ? jsArr : ''
        })
        delete require.cache[getProcessCwd(`./src/tpl/biglet_${i}/index.js`)]
      }
      const BigletObj = require(getProcessCwd(`./src/tpl/biglet_${i}/index.js`))
      bigView.add(BigletObj)
      $(`#biglet_${i}`).empty()
    }

    // 爬取layout
    let layout = options.zip === true ? myMinify($.html('html')) : $.html('html')

    layout = layout.replace('</body>', '').replace('</html>', '')
    layout += '<script src="{{bigview}}"></script><script>bigview.ready();</script>'
    if (!fs.existsSync(getProcessCwd('./src/tpl/bp-layout')) || global.refresh) {
      mkdirs(getProcessCwd('./src/tpl/bp-layout'))
      fs.writeFileSync(getProcessCwd(`./src/tpl/bp-layout/index.nj`), layout)
      await renderJsTpl(ctx, '../jstpl/layoutjstpl.nj', {
        name: 'bp-layout',
        bigview: 'http://localhost/js/bigview.runtime.js'
      })
      delete require.cache[getProcessCwd('./src/tpl/bp-layout/index.js')]
    }
    const bpLayout = require(getProcessCwd('./src/tpl/bp-layout/index.js'))
    bigView.layout = bpLayout

    // set layout
    // you can custom bigView dataStore
    bigView.dataStore = {}
    // bigView.mode = 'pipeline'
    ctx.status = 200
    global.refresh = false
    await bigView.start()
  }
  if (!url) {
    console.log('you must input url')
  }
  return new Promise(resolve => {
    if (redisClient) {
      // 如果启用了redis 走这套缓存逻辑
      redisClient.get(url, async (err, rep) => {
        if (err) {
          console.log(err)
          return
        }
        if (rep !== null) {
          // 如果redis有缓存结果就直接从redis获取
          await mainFunc(rep)
          resolve()
          requestHtml(url, newRep => {
            let html = newRep.text
            if (html !== rep) {
              // 如果原页面内容改变 缓存新的html
              global.refresh = true
              redisClient.set(url, html)
            }
          })
        } else {
          global.refresh = true
          requestHtml(url, async rep => {
            let html = rep.text
            redisClient.set(url, html) // 缓存爬虫结果
            await mainFunc(html)
            resolve()
          })
        }
      })
    } else {
      requestHtml(url, async rep => {
        let html = rep.text
        await mainFunc(html)
        resolve()
        requestHtml(url, newRep => {
          let html = newRep.text
          if (html !== rep) {
            global.refresh = true // 重新生成模版文件
          }
        })
      })
    }
  })
}

module.exports = html2Bigvew
