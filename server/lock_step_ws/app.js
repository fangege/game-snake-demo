const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const cookieParser = require('cookie-parser');
app.use(cookieParser());


app.set('views', __dirname);
app.set('view engine', 'ejs');
app.get('/snake', (req, res) => {
    const player = req.query.player; // 获取名为"name"的查询参数
    res.cookie('player', player);
    res.render('index', { player: req.query.player });
});

app.use(express.json());
// 处理WebSocket连接
io.on('connection', (socket) => {
    console.log('新的WebSocket连接已建立');

    // 处理接收到的消息
    socket.on('message', (data) => {
        console.log('接收到消息:', data);
        // 广播消息给所有连接的客户端
        //io.emit('message', data);
    });

    // 处理断开连接
    socket.on('disconnect', () => {
        console.log('WebSocket连接已断开');
    });
});

// 启动服务器
const port = 3000;
server.listen(port, () => {
    console.log(`服务器已启动，监听端口 ${port}`);
});