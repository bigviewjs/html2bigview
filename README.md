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

6) 使用方式
以koa项目示例

```
const html2bigview = require('html2bigview')
// 启用redis来缓存爬虫结果 可选
const redis = require('redis')
const client = redis.createClient()

async index (ctx) {
  await html2bigview(url, {
      zip: true, // 默认是true，压缩html
      redisClient: client, // 默认是false, 使用redis储存爬虫内容,不传使用lru-cache来缓存爬虫内容，lru-cache缓存在重启应用后会失效非永久缓存
      headJs: [], // 需要在head头部或者layout加载的js url，不传入默认全部放在body底部加载
      tplPath: 'src/tpl', 生成的pagelet文件存放的路径，默认是当前工作区的/src/tpl目录下
  })
}
```

## 注意事项
一键化转换为bigview渲染模式是一把利剑但不适用于任何场景

### 优势
- 服务端能够并行计算并且分块吐出页面
- 提升看到layout的速度

### 劣势
- 相比于直接打开一个html网页多了服务端计算的过程，新增了TTFB时间

### 适用场景
因该模块是一键化的工作流，所以获取数据的逻辑还是在客户端进行。适用于页面静态内容较多
或者需要分屏展示的页面

如果要进一步提升性能，可以直接手动使用bigview模块，并编写服务端获取数据逻辑

### 效果展示
[demo地址](https://github.com/zhangyuang/testhtml2bigview)
[原html网页地址](http://g.alicdn.com/ku/bigview.runtime/1.4.9/html2bigview/index.html) 
### 测试环境:
MacBook Chrome 性能设置为 fast3G 4xslowdown
![](https://img.alicdn.com/tfs/TB1i7k1firpK1RjSZFhXXXSdXXa-1634-130.png)
### 统计方式
使用html5的performance api分别在页面头部和body底部打点统计
![](https://img.alicdn.com/tfs/TB1K34hfxnaK1RjSZFBXXcW7VXa-776-192.png)
![](https://img.alicdn.com/tfs/TB1VXg1fkvoK1RjSZFNXXcxMVXa-794-286.png)
### 未使用bigpipe模式
![未使用bigpipe](https://img.alicdn.com/tfs/TB1BZUTfmzqK1RjSZPcXXbTepXa-2732-1466.png)
###使用bigpipe模式
![使用bigpipe](https://img.alicdn.com/tfs/TB1sIw0fXzqK1RjSZFvXXcB7VXa-2674-1460.png)

### 总结
可以看到pageStart->layout这部分的时间是缩短了很多的，pageStart的时间为输入url到页面执行到该处的时间，视具体设备环境配置网速和服务器配置决定。
