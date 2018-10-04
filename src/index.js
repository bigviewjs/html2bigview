'use strict'

const BigView = require('bigview')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const { mkdirs, getProcessCwd, renderJsTpl, enHance, requestHtml, myMinify } = require('./util')
const LRU = require('lru-cache')
const caches = LRU({
  maxAge: 1000 * 60 * 60 * 24 // 过期时间1天
})
global.enterTime = 1

async function html2Bigvew (ctx, url, {redisClient = false, zip = true, headJs = [], tplPath = 'src/tpl'}) {
  if (!url || !ctx) {
    console.log('you must input url and ctx')
  }
  enHance(ctx) // 给ctx增加渲染模版功能
  const bigView = new BigView(ctx)
  ctx.set('Content-Type', 'text/html; charset=UTF-8')
  const mainFunc = async (html) => {
    const $ = cheerio.load(html, {decodeEntities: false}) // 关闭html实体编码转换
    if ($('#bp-main').length !== 0) {
      // 爬取bp-main 是否压缩
      const bpMain = zip === true ? myMinify($('#bp-main').html()) : $('#bp-main').html()
      if (!fs.existsSync(getProcessCwd(`./${tplPath}/bp-main/index.js`)) || global.refresh) {
        mkdirs(path.join(getProcessCwd(`./${tplPath}/bp-main`))) // 创建/src/tpl/bp-main文件夹
        fs.writeFileSync(getProcessCwd(`./${tplPath}/bp-main/index.nj`), bpMain) // 将爬虫的bp-main内容写入模版
        await renderJsTpl(ctx, '../jstpl/mainjstpl.nj', {
          name: 'bp-main',
          tplPath: tplPath
        }) // 生成 src/tpl/bp-main/index.js文件
        delete require.cache[getProcessCwd(`./${tplPath}/bp-main/index.js`)] // 清空require缓存
      }
      const mainPageLet = require(getProcessCwd(`./${tplPath}/bp-main/index.js`))
      bigView.main = mainPageLet
      $('#bp-main').empty()
    }

    // 获取页面所有脚本文件，并且把加载过程放入最后一个pagelet，避免阻塞layuot和bpmain的渲染
    const re = /\/\/(.*)?\.js$/
    let scripts = $('script').filter((index, element) => {
      // 只匹配src为js文件的脚本，且js不需要放在head头部
      if (element.attribs.src) {
        return re.test(element.attribs.src) && (headJs.indexOf(element.attribs.src) === -1)
      }
    })
    scripts.remove() // 从layout中移除脚本文件
    let jsArr = []
    scripts.map((index, item) => {
      jsArr.push(item.attribs.src)
    })
    const allBlglet = $('.biglet')
    for (let i = 1; i <= allBlglet.length; i++) {
      // 爬取biglet
      const biglet = zip === true ? myMinify($(`#biglet_${i}`).html()) : $(`#biglet_${i}`).html()
      if (!fs.existsSync(getProcessCwd(`./${tplPath}/biglet_${i}`)) || global.refresh) {
        mkdirs(getProcessCwd(`./${tplPath}/biglet_${i}`))
        fs.writeFileSync(getProcessCwd(`./${tplPath}/biglet_${i}/index.nj`), biglet)
        await renderJsTpl(ctx, '../jstpl/bigletchildren.nj', {
          name: `biglet_${i}`,
          tplPath: tplPath,
          js: i === allBlglet.length ? JSON.stringify(jsArr) : ''
        })
        delete require.cache[getProcessCwd(`./${tplPath}/biglet_${i}/index.js`)]
      }
      const BigletObj = require(getProcessCwd(`./${tplPath}/biglet_${i}/index.js`))
      bigView.add(BigletObj)
      $(`#biglet_${i}`).empty()
    }

    // 爬取layout
    let layout = zip === true ? myMinify($.html('html')) : $.html('html')
    layout = layout.replace('</body>', '').replace('</html>', '')
    layout += '<script src="{{bigview}}"></script><script>bigview.ready();</script>'
    if (!fs.existsSync(getProcessCwd(`./${tplPath}/bp-layout`)) || global.refresh) {
      mkdirs(getProcessCwd(`./${tplPath}/bp-layout`))
      fs.writeFileSync(getProcessCwd(`./${tplPath}/bp-layout/index.nj`), layout)
      await renderJsTpl(ctx, '../jstpl/layoutjstpl.nj', {
        name: 'bp-layout',
        tplPath: tplPath,
        bigview: '//g.alicdn.com/ku/bigview.runtime/1.4.9/bigview.runtime.min.js'
      })
      delete require.cache[getProcessCwd(`./${tplPath}/bp-layout/index.js`)]
    }
    const bpLayout = require(getProcessCwd(`./${tplPath}/bp-layout/index.js`))
    bigView.layout = bpLayout
    // bigView.mode = 'pipeline'
    ctx.status = 200
    global.refresh = false
    await bigView.start()
  }
  return new Promise(async resolve => {
    if (redisClient) {
      // 如果启用了redis 走这套缓存逻辑
      redisClient.get(url, async (err, rep) => {
        if (err) {
          console.log(err)
          return
        }
        if (rep !== null) {
          // 如果redis有缓存结果就直接从redis获取
          if (global.enterTime === 1) {
            // 如果是首次启动应用强制更新已有模版
            console.log(`首次启动应用，重新生成模版`)
            global.enterTime++
            global.refresh = true
            requestHtml(url, async rep => {
              let html = rep.text
              redisClient.set(url, html) // 缓存爬虫结果
              await mainFunc(html)
              resolve()
            })
          } else {
            console.log(`二次进入应用，直接使用缓存内容并在后台更新缓存`)
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
          }
        } else {
          console.log(`缓存为空，开始爬取页面`)
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
      console.log(`未启动redis, 使用lru-cache缓存`)
      const html = caches.get(url)
      if (html !== undefined) {
        console.log(`直接使用lru-cache缓存并在后台更新缓存`)
        await mainFunc(html)
        resolve()
        requestHtml(url, newRep => {
          const newHtml = newRep.text
          if (newHtml !== html) {
            caches.set(url, newHtml)
            global.refresh = true // 重新生成模版文件
          }
        })
      } else {
        console.log(`lru-cache缓存为空，开始爬取页面`)
        global.refresh = true
        requestHtml(url, async rep => {
          const html = rep.text
          await mainFunc(html)
          caches.set(url, html)
          resolve()
        })
      }
    }
  })
}

module.exports = html2Bigvew
