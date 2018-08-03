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

div.bp-layout
    div.biglet_1(biglet)
    div.biglet_name(biglet)


- http爬虫
- jsdom

3) 获取元数据

记录所有模块

- bp-layout
- biglet_1
- biglet_name

4）写生成器

按照bigview-koa-demo

- index.js
    - add && require
- biglets

5）发布到npm