'use strict'

const BigView = require('bigview')
const request = require('superagent')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const { mkdirs, getProcessCwd, renderJsTpl, enHance, insertBigviewRuntime } = require('./util')
const redis = require('redis')
const client = redis.createClient()
const { promisify } = require('util')
const getAsync = promisify(client.get).bind(client)

async function html2Bigvew (ctx, url) {
  enHance(ctx) // 给ctx增加渲染模版功能
  const bigView = new BigView(ctx)
  const mainFunc = async (html) => {
    let layout
    let $ = cheerio.load(html, {decodeEntities: false}) // 关闭html实体编码转换
    if ($('#bp-main').length !== 0) {
      let mainPageLet = await getAsync(`${url}mainPageLet`)
      if (mainPageLet) {
        bigView.main = mainPageLet
      } else {
        // 爬取bp-main
        let bpMain = $('#bp-main').html()
        mkdirs(path.join(getProcessCwd('./src/tpl/bp-main')))
        fs.writeFileSync(getProcessCwd('./src/tpl/bp-main/index.nj'), bpMain)
        await renderJsTpl(ctx, '../jstpl/mainjstpl.nj', 'bp-main')
        mainPageLet = require(getProcessCwd('./src/tpl/bp-main/index.js'))
        client.set(`${url}mainPageLet`, mainPageLet)
        bigView.main = mainPageLet
      }
      $('#bp-main').empty()
    }
    let allBlglet = $('.biglet')
    let bigletArr = await getAsync(`${url}biglet`)
    if (bigletArr !== null && bigletArr.length !== 0) {
      bigletArr.map(item => {
        bigView.add(item)
      })
    } else {
      for (let i = 1; i <= allBlglet.length; i++) {
        // 爬取biglet
        let biglet = $(`#biglet_${i}`).html()
        mkdirs(getProcessCwd(`./src/tpl/biglet_${i}`))
        fs.writeFileSync(getProcessCwd(`./src/tpl/biglet_${i}/index.nj`), biglet)
        await renderJsTpl(ctx, '../jstpl/bigletchildren.nj', `biglet_${i}`)
        const bigletObj = require(getProcessCwd(`./src/tpl/biglet_${i}`))
        bigletArr.push(bigletObj)
        bigView.add(bigletObj)
        $(`#biglet_${i}`).empty()
      }
      client.set(`${url}biglet`, bigletArr)
    }

    let bplayout = await getAsync(`${url}bplayout`)
    if (bplayout) {
      bigView.layout = bplayout
    } else {
      // 爬取layout
      layout = $.html('html')
      // 插入bigview.runtime.js
      layout = insertBigviewRuntime(layout)
      mkdirs(getProcessCwd('./src/tpl/bp-layout'))
      fs.writeFileSync(getProcessCwd(`./src/tpl/bp-layout/index.nj`), layout)
      await renderJsTpl(ctx, '../jstpl/layoutjstpl.nj', 'bp-layout')
      // set layout
      const bplayout = require(getProcessCwd('./src/tpl/bp-layout'))
      bigView.layout = bplayout
      client.set(`${url}bplayout`, bplayout)
    }
    // you can custom bigView dataStore
    bigView.dataStore = {}
    // bigView.mode = 'pipeline'
    ctx.status = 200
    await bigView.start()
  }
  if (url) {
    return new Promise(resolve => {
      client.get(url, async (err, rep) => {
        if (err) {
          console.log(err)
          return
        }
        if (rep !== null) {
          // 如果redis有缓存结果就直接从redis获取
          await mainFunc(rep)
          resolve()
          request
            .get(url)
            .set('Content-Type', 'text/html; charset=UTF-8')
            .end((err, rep) => {
              if (err) {
                console.log(err)
                return
              }
              let html = rep.text
              if (html !== rep) {
                client.flushall() // 源码改变就清空所有缓存
                client.set(url, html) // 缓存新的html
              }
            })
        } else {
          request
            .get(url)
            .set('Content-Type', 'text/html; charset=UTF-8')
            .end(async (err, rep) => {
              if (err) {
                console.log(err)
                return
              }
              let html = rep.text
              client.set(url, html) // 缓存爬虫结果
              await mainFunc(html)
              resolve()
            })
        }
      })
    })
  }
}

module.exports = html2Bigvew
