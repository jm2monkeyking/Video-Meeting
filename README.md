# Video Meeting

Google Meet / Zoom clone in a few lines of code.

Video Meeting is a video conference website that lets you stay in touch with all your friends.

Developed with ReactJS, Node.js, SocketIO.

![Website](https://i.imgur.com/HhZD01o.jpg)

### Website
Try Video Meeting here [video.sebastienbiollo.com](https://video.sebastienbiollo.com)


### Features
- Is 100% free and open-source
- No account needed
- Unlimited users
- Messaging chat and video streaming in real-time
- Screen sharing to present documents, slides, and more
- Everyting is peer-to-peer thanks to webrtc


### Local setup

1. `yarn install`
2. `yarn dev`

技术栈
- Express Framework
- Sequalize()

环境
- [Nodejs](https://nodejs.org/en/download/)
- [ffmpeg](https://ffmpeg.org/download.html)

建议项目管理工具
- [pm2](https://pm2.keymetrics.io/docs/usage/quick-start/)


这个项目的模板引擎是用[EJS](https://link-url-here.org) 类似PHP 中的 <?php ?>


- [x] 建立新房间 
- [x] 切换视频，



## 待解决

|问题|现在|缺点|改善建议|
|---	|---	|---	|---	|
|录制&上传视频|录制视频时使用 [RecordRTC](https://www.webrtc-experiment.com/RecordRTC/) 进行视频录制, 录制完成时讲影片存入IndexDB...在结束视频录制时通过service worker 将视频(blob Object)分片上传只服务器....|用户如果直接把电脑关机，将不能直接让视频同步至服务器|使用websocket 实时同步视频分片到服务器，使用MediaRecorder API (RecordRTC会Record 整个\<video>...变成一个大blob (需要另外写分片函数 和ajax上传函数)....可以参考[范例](https://stackoverflow.com/questions/13885404/canvas-takes-the-whole-document-body-in-html-and-make-it-hidden-but-drawable) 配合MediaRecorder API 可以在recording时 实时用websocket发送 chunk到server,[可参考](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API), 另外有一个开源的WebRTC工具[Livekit](https://github.com/livekit/livekit) ,<b>支持开源 录制,屏幕共享,视频录制</b>|
|数据库链接|尚未链接数据库|   	|可以使用[Sequalize](https://sequelize.org/), 可参考[例子](https://www.bezkoder.com/node-js-express-sequelize-mysql/)|
|白板|   	|   	|[whitebophir](https://github.com/lovasoa/whitebophir)是一个有HTML5 和 Nodejs 结合的白板功能，比较容易上手|
|   	|   	|   	|   	|
|   	|   	|   	|   	|
|   	|   	|   	|   	|