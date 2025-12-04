const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const GameEngine = require('./game_engine');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 游戏配置
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    TANK_SIZE: 30,
    TANK_SPEED: 2,
    TANK_TURN_SPEED: 0.05,
    BULLET_SPEED: 5,
    BULLET_SIZE: 4,
    MAX_HEALTH: 100,
    BULLET_DAMAGE: 20,
    FIRE_COOLDOWN: 500,
    MAX_BULLETS: 3,
    TICK_RATE: 60, // 服务端更新频率
    BROADCAST_RATE: 20 // 状态广播频率
};

// 游戏房间管理
class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.gameEngine = new GameEngine(CONFIG);
        this.gameState = this.gameEngine.getInitialState();
        this.lastUpdate = Date.now();
        this.running = false;
        this.maxPlayers = 2;
    }

    addPlayer(playerId, ws) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }

        const playerNumber = this.players.size + 1;
        const startX = playerNumber === 1 ? 150 : CONFIG.CANVAS_WIDTH - 150;
        const startY = CONFIG.CANVAS_HEIGHT / 2;
        const startAngle = playerNumber === 1 ? 0 : Math.PI;
        const color = playerNumber === 1 ? '#3498db' : '#e74c3c';

        const player = {
            id: playerId,
            ws: ws,
            playerNumber: playerNumber,
            tank: this.gameEngine.createTank(startX, startY, startAngle, color, playerId),
            lastInputSequence: 0,
            connected: true
        };

        this.players.set(playerId, player);
        
        // 发送初始化消息
        this.sendToPlayer(playerId, {
            type: 'init',
            playerId: playerId,
            playerNumber: playerNumber,
            gameState: this.gameState,
            config: CONFIG
        });

        // 通知其他玩家
        this.broadcast({
            type: 'player_joined',
            playerId: playerId,
            playerNumber: playerNumber
        }, playerId);

        // 如果房间满了，开始游戏
        if (this.players.size === this.maxPlayers && !this.running) {
            this.startGame();
        }

        return true;
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.connected = false;
            this.players.delete(playerId);
            
            // 通知其他玩家
            this.broadcast({
                type: 'player_left',
                playerId: playerId
            });

            // 如果没有玩家了，停止游戏
            if (this.players.size === 0) {
                this.stopGame();
            }
        }
    }

    processInput(playerId, inputData) {
        const player = this.players.get(playerId);
        if (!player || !this.running) return;

        // 验证输入序列号（防止重复处理）
        if (inputData.sequence <= player.lastInputSequence) {
            return;
        }
        player.lastInputSequence = inputData.sequence;

        // 应用输入到游戏引擎
        this.gameEngine.processPlayerInput(playerId, inputData);

        // 发送输入确认
        this.sendToPlayer(playerId, {
            type: 'input_confirm',
            sequence: inputData.sequence,
            serverTime: Date.now()
        });
    }

    startGame() {
        this.running = true;
        this.gameState = this.gameEngine.startGame(Array.from(this.players.values()));
        
        this.broadcast({
            type: 'game_start',
            gameState: this.gameState
        });

        console.log(`Game started in room ${this.id}`);
    }

    stopGame() {
        this.running = false;
        console.log(`Game stopped in room ${this.id}`);
    }

    update() {
        if (!this.running) return;

        const now = Date.now();
        const deltaTime = now - this.lastUpdate;
        this.lastUpdate = now;

        // 更新游戏状态
        this.gameState = this.gameEngine.update(deltaTime);

        // 检查游戏结束条件
        const winner = this.gameEngine.checkGameEnd();
        if (winner) {
            this.broadcast({
                type: 'game_end',
                winner: winner,
                gameState: this.gameState
            });
            this.stopGame();
        }
    }

    broadcastState() {
        if (!this.running) return;

        this.broadcast({
            type: 'state_update',
            serverTime: Date.now(),
            gameState: this.gameState
        });
    }

    sendToPlayer(playerId, message) {
        const player = this.players.get(playerId);
        if (player && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    }

    broadcast(message, excludePlayerId = null) {
        this.players.forEach((player, playerId) => {
            if (playerId !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(message));
            }
        });
    }
}

// 房间管理器
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.playerRooms = new Map(); // playerId -> roomId
    }

    findOrCreateRoom(playerId) {
        // 寻找有空位的房间
        for (const [roomId, room] of this.rooms) {
            if (room.players.size < room.maxPlayers) {
                return room;
            }
        }

        // 创建新房间
        const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const room = new GameRoom(roomId);
        this.rooms.set(roomId, room);
        return room;
    }

    addPlayerToRoom(playerId, ws) {
        const room = this.findOrCreateRoom(playerId);
        const success = room.addPlayer(playerId, ws);
        
        if (success) {
            this.playerRooms.set(playerId, room.id);
            console.log(`Player ${playerId} joined room ${room.id}`);
        }
        
        return success;
    }

    removePlayerFromRoom(playerId) {
        const roomId = this.playerRooms.get(playerId);
        if (roomId) {
            const room = this.rooms.get(roomId);
            if (room) {
                room.removePlayer(playerId);
                
                // 如果房间空了，删除房间
                if (room.players.size === 0) {
                    this.rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted`);
                }
            }
            this.playerRooms.delete(playerId);
        }
    }

    getPlayerRoom(playerId) {
        const roomId = this.playerRooms.get(playerId);
        return roomId ? this.rooms.get(roomId) : null;
    }

    updateAllRooms() {
        this.rooms.forEach(room => room.update());
    }

    broadcastAllStates() {
        this.rooms.forEach(room => room.broadcastState());
    }
}

const roomManager = new RoomManager();

// 配置EJS模板引擎
app.set('view engine', 'ejs');
app.set('views', __dirname);

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../')));

// 路由
app.get('/tank_battle', (req, res) => {
    res.render('client_prediction');
});

// WebSocket连接处理
wss.on('connection', (ws, req) => {
    const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log(`Player ${playerId} connected`);

    // 尝试将玩家加入房间
    const success = roomManager.addPlayerToRoom(playerId, ws);
    if (!success) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Unable to join game room'
        }));
        ws.close();
        return;
    }

    // 处理消息
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const room = roomManager.getPlayerRoom(playerId);
            
            if (!room) return;

            switch (message.type) {
                case 'input':
                    room.processInput(playerId, message);
                    break;
                case 'ping':
                    ws.send(JSON.stringify({
                        type: 'pong',
                        clientTime: message.clientTime,
                        serverTime: Date.now()
                    }));
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    // 处理断开连接
    ws.on('close', () => {
        console.log(`Player ${playerId} disconnected`);
        roomManager.removePlayerFromRoom(playerId);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for player ${playerId}:`, error);
        roomManager.removePlayerFromRoom(playerId);
    });
});

// 游戏循环
setInterval(() => {
    roomManager.updateAllRooms();
}, 1000 / CONFIG.TICK_RATE);

// 状态广播循环
setInterval(() => {
    roomManager.broadcastAllStates();
}, 1000 / CONFIG.BROADCAST_RATE);

// 启动服务器
const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
    console.log(`Tank Battle server running on port ${PORT}`);
    console.log(`Game available at: http://localhost:${PORT}/tank_battle`);
});

module.exports = app;