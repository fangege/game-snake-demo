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


let canvas = {
    width:1000,
    height: 1000,
}


let gameState = {
    player1:{},
    player2:{},
    food:{},
    gameStartTime:0,
    turn:0,
}
function initGameData(){
    gameState.player1 = {
        x: 0,
        y: 0,
        speed: 10,
        direction: 'right',
        tail: [],
        score: 0,
    };
    gameState.player2 = {
        x: 200,
        y: 200,
        speed: 10,
        direction: 'left',
        tail: [],
        score: 0,
    };
    gameState.food = {
        x: Math.floor(Math.random() * (canvas.width / 10)) * 10,
        y: Math.floor(Math.random() * (canvas.height / 10)) * 10
    };
    gameState.gameStartTime = new Date().getMilliseconds()
}

function updateSnake(player) {
    // 更新蛇身
    player.tail.unshift({ x: player.x, y: player.y });
    if (player.tail.length > 5) {
        player.tail.pop();
    }

    // 更新蛇头位置
    if (player.direction === 'up') {
        player.y -= player.speed;
    } else if (player.direction === 'down') {
        player.y += player.speed;
    } else if (player.direction === 'left') {
        player.x -= player.speed;
    } else if (player.direction === 'right') {
        player.x += player.speed;
    }

    // 边界检测
    if (player.x < 0 || player.x >= canvas.width || player.y < 0 || player.y >= canvas.height) {
        player.direction = 'stop';
    }
}


function gameLoop() {
    let player1 = gameState.player1
    let player2 = gameState.player2
    // 更新贪食蛇位置
    updateSnake(player1);
    updateSnake(player2);
    checkFoodCollision(player1);
    checkFoodCollision(player2);
    gameState.turn ++;
}

function checkFoodCollision(player) {
    let food = gameState.food
    if (player.x === food.x && player.y === food.y) {
        player.score ++
        // 吃到食物后，随机生成新的食物位置
        food.x = Math.floor(Math.random() * (canvas.width / 10)) * 10;
        food.y = Math.floor(Math.random() * (canvas.height / 10)) * 10;
        // 增加贪食蛇的长度
        player.tail.push({ x: player.x, y: player.y });
    }
}

function handleKeyPress(event,player) {
    let player1 = gameState[player]
    if(player1 === undefined){
        return
    }
    if (event.key === 'w' && player1.direction !== 'down') {
        player1.direction = 'up';
    } else if (event.key === 's' && player1.direction !== 'up') {
        player1.direction = 'down';
    } else if (event.key === 'a' && player1.direction !== 'right') {
        player1.direction = 'left';
    } else if (event.key === 'd' && player1.direction !== 'left') {
        player1.direction = 'right';
    }
}

// 处理POST请求，接收JSON数据
app.post('/event', (req, res) => {
    const player = req.cookies.player;
    const data = req.body; // 从请求体中获取JSON数据
    if(data.type === "start") {
        initGameData()
        gameLoopInterval = setInterval(gameLoop, 500); // 5秒后执行
    }
    if(data.type === "end") {
        clearInterval(gameLoopInterval)
    }
    if(data.type === "keyboard"){
        handleKeyPress(data,player)
    }
    res.json({});
});

app.post('/state', (req, res) => {
    const data = req.body; // 从请求体中获取JSON数据
    res.json(gameState);
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});