# html2bigview


## 原理

一个html页面如何快速变成bigpipe(熟悉bigview)吐出 

```
layout（默认body，可以指定.bp-layout）

div.bp
div.bp

html2bigview
```

## 实现步骤

1) 熟悉bigview demo

https://github.com/i5ting/bigview-koa-demo


2）区分页面

- body
- layout（）
- bpmain
- biglet
div#bp-layout
    #bp-main
    div.biglet #biglet_1(biglet) // 需要给所有的biglet添加class biglet 并且添加id `#biglet_${i}`
    div.biglet #biglet_name(biglet)
- http爬虫
- jsdom

3) 获取元数据

记录所有模块

- bp-layout
- bp-main
- biglet_1
- biglet_name

4）写生成器

按照bigview-koa-demo

- index.js
    - add && require
- biglets

5）发布到npm

6) 使用方式（需引入bigview.runtime.js)

```
const html2bigview = require('html2bigview')
// 启用redis来缓存爬虫结果 可选
const redis = require('redis')
const client = redis.createClient()

async index (ctx) {
  await html2bigview(url, {
      zip: true, // 默认是true，压缩html去除换行符
      redisClient: client, // 默认是false, 使用redis缓存爬虫内容
  })
}
```

