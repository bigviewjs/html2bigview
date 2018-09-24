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
    div.biglet #biglet_1(biglet)
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

async index (ctx) {
  await html2bigview(url)
}
```
