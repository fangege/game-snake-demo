const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const websocket = require('./websocket')
const cookieParser = require('cookie-parser');


app.use(cookieParser());
app.set('views', __dirname);
app.set('view engine', 'ejs');
app.get('/snake', (req, res) => {
    const player = req.query.player; // 获取名为"name"的查询参数
    res.cookie('player', player);
    res.render('index', { player: req.query.player });
});

// 启动服务器
const port = 3000;
server.listen(port, () => {
    console.log(`服务器已启动，监听端口 ${port}`);
    websocket(server)
});