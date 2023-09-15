const express = require('express');
const app = express();
const port = 3000;
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.set('views', __dirname);
app.set('view engine', 'ejs');
app.get('/snake', (req, res) => {
    const player = req.query.player; // 获取名为"name"的查询参数
    res.cookie('player', player);
    res.render('index', { player: req.query.player });
});

// 使用express.json()中间件来解析JSON数据
app.use(express.json());

let gameLoopInterval; // 用于存储游戏循环的 setInterval 返回值
let gameState = {
    gameStartTime:0,
    gameEndTime:0,
    turn:0,
    current_event:{},
    turn_event_list:[]
}

function gameLoop() {
    gameState.turn ++;
    gameState.turn_event_list.unshift({
        turn: gameState.turn,
        event:gameState.current_event,
        gameTime:new Date().getMilliseconds() - gameState.gameStartTime
    })
    gameState.current_event = {}
}


// 处理POST请求，接收JSON数据
app.post('/event', (req, res) => {
    const player = req.cookies.player;
    const data = req.body; // 从请求体中获取JSON数据
    if(data.type === "start") {
        if( gameState.gameStartTime === 0 ){
            gameState.gameStartTime = new Date().getMilliseconds()
            gameLoopInterval = setInterval(gameLoop, 500); // 5秒后执行
        }
    }
    if(data.type === "end") {
        gameState.gameStartTime = 0
        gameState.gameEndTime = new Date().getMilliseconds()

        for(let turn of gameState.turn_event_list){
            if(turn.event.length!==0){
                console.log(JSON.stringify(turn.event))
            }
        }

        console.log(JSON.stringify(gameState.turn_event_list))
        clearInterval(gameLoopInterval)
    }
    if(data.type === "keyboard"){
        gameState.current_event[player] = data
    }
    res.json({});
});

app.post('/state', (req, res) => {
    const turn = req.body.turn
    if(turn >= gameState.turn){
        res.json({result:[]})
        return
    }
    let result = []
    for(let event of gameState.turn_event_list){
        if(event.turn > turn){
            result.unshift(event)
        }
    }
    res.json({result});
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});