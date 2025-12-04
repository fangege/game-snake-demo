const PhysicsEngine = require('./physics');

// 游戏引擎 - 服务端权威逻辑
class GameEngine {
    constructor(config) {
        this.config = config;
        this.physics = new PhysicsEngine(config);
        this.gameState = {
            players: new Map(),
            bullets: [],
            gameTime: 0,
            running: false
        };
        this.inputHistory = new Map(); // playerId -> inputs[]
        this.stateHistory = []; // 用于回滚和重放
        this.antiCheat = {
            maxInputRate: 100, // 每秒最大输入次数
            playerInputCounts: new Map(),
            suspiciousActivities: new Map()
        };
    }

    getInitialState() {
        return {
            players: {},
            bullets: [],
            gameTime: 0,
            running: false
        };
    }

    createTank(x, y, angle, color, playerId) {
        return {
            id: playerId,
            x: x,
            y: y,
            angle: angle,
            color: color,
            health: this.config.MAX_HEALTH,
            score: 0,
            lastFireTime: 0,
            input: {
                forward: false,
                backward: false,
                turnLeft: false,
                turnRight: false,
                fire: false
            }
        };
    }

    startGame(players) {
        this.gameState.running = true;
        this.gameState.gameTime = Date.now();
        
        // 初始化玩家状态
        players.forEach(player => {
            this.gameState.players.set(player.id, player.tank);
        });

        return this.serializeGameState();
    }

    processPlayerInput(playerId, inputData) {
        const player = this.gameState.players.get(playerId);
        if (!player) return false;

        // 反作弊检查
        if (!this.validatePlayerInput(playerId, inputData)) {
            console.warn(`Suspicious input from player ${playerId}`);
            return false;
        }

        // 记录输入历史
        if (!this.inputHistory.has(playerId)) {
            this.inputHistory.set(playerId, []);
        }
        
        const history = this.inputHistory.get(playerId);
        const now = Date.now();
        
        history.push({
            sequence: inputData.sequence,
            timestamp: inputData.timestamp,
            serverTime: now,
            input: inputData.input,
            processed: false
        });

        // 保持历史记录在合理范围内
        if (history.length > 200) {
            history.splice(0, 100);
        }

        // 应用输入（使用物理引擎验证）
        const previousInput = player.input || {};
        const deltaTime = history.length > 1 ? now - history[history.length - 2].serverTime : 16;
        
        if (this.physics.validateInput(inputData.input, previousInput, deltaTime)) {
            player.input = { ...inputData.input };
            return true;
        }
        
        return false;
    }

    // 验证玩家输入（反作弊）
    validatePlayerInput(playerId, inputData) {
        const now = Date.now();
        
        // 检查输入频率
        if (!this.antiCheat.playerInputCounts.has(playerId)) {
            this.antiCheat.playerInputCounts.set(playerId, { count: 0, lastReset: now });
        }
        
        const inputCount = this.antiCheat.playerInputCounts.get(playerId);
        
        // 每秒重置计数
        if (now - inputCount.lastReset > 1000) {
            inputCount.count = 0;
            inputCount.lastReset = now;
        }
        
        inputCount.count++;
        
        // 检查是否超过最大输入频率
        if (inputCount.count > this.antiCheat.maxInputRate) {
            this.recordSuspiciousActivity(playerId, 'high_input_rate', inputCount.count);
            return false;
        }
        
        // 检查时间戳合理性
        const timeDiff = Math.abs(now - inputData.timestamp);
        if (timeDiff > 5000) { // 5秒容差
            this.recordSuspiciousActivity(playerId, 'invalid_timestamp', timeDiff);
            return false;
        }
        
        // 检查序列号
        const history = this.inputHistory.get(playerId) || [];
        if (history.length > 0) {
            const lastSequence = history[history.length - 1].sequence;
            if (inputData.sequence <= lastSequence) {
                this.recordSuspiciousActivity(playerId, 'invalid_sequence', inputData.sequence);
                return false;
            }
        }
        
        return true;
    }

    // 记录可疑活动
    recordSuspiciousActivity(playerId, type, data) {
        if (!this.antiCheat.suspiciousActivities.has(playerId)) {
            this.antiCheat.suspiciousActivities.set(playerId, []);
        }
        
        const activities = this.antiCheat.suspiciousActivities.get(playerId);
        activities.push({
            type: type,
            data: data,
            timestamp: Date.now()
        });
        
        // 保持记录在合理范围内
        if (activities.length > 50) {
            activities.splice(0, 25);
        }
        
        console.log(`Suspicious activity: ${playerId} - ${type}:`, data);
    }

    update(deltaTime) {
        if (!this.gameState.running) return this.serializeGameState();

        // 保存当前状态到历史（用于回滚）
        this.saveStateToHistory();

        // 更新所有玩家
        this.gameState.players.forEach(player => {
            this.updatePlayer(player, deltaTime);
        });

        // 更新子弹
        this.updateBullets(deltaTime);

        // 检测碰撞
        const collisionEvents = this.detectCollisions();

        // 清理无效子弹
        this.gameState.bullets = this.gameState.bullets.filter(bullet => bullet.active);

        // 处理碰撞事件
        this.processCollisionEvents(collisionEvents);

        return this.serializeGameState();
    }

    // 保存状态到历史
    saveStateToHistory() {
        const stateSnapshot = {
            timestamp: Date.now(),
            players: new Map(),
            bullets: [...this.gameState.bullets],
            hash: null
        };
        
        // 深拷贝玩家状态
        this.gameState.players.forEach((player, playerId) => {
            stateSnapshot.players.set(playerId, { ...player });
        });
        
        // 计算状态哈希
        stateSnapshot.hash = this.physics.calculateStateHash(this.serializeGameState());
        
        this.stateHistory.push(stateSnapshot);
        
        // 保持历史记录在合理范围内
        if (this.stateHistory.length > 300) { // 5秒历史（60fps）
            this.stateHistory.splice(0, 150);
        }
    }

    // 处理碰撞事件
    processCollisionEvents(events) {
        events.forEach(event => {
            switch (event.type) {
                case 'bullet_hit':
                    console.log(`Player ${event.shooterId} hit player ${event.targetId} for ${event.damage} damage`);
                    break;
                case 'tank_collision':
                    console.log(`Tank collision between ${event.player1Id} and ${event.player2Id}`);
                    break;
            }
        });
    }

    // 回滚到指定时间点的状态
    rollbackToTime(timestamp) {
        const targetState = this.stateHistory.find(state => 
            Math.abs(state.timestamp - timestamp) < 50 // 50ms容差
        );
        
        if (targetState) {
            this.gameState.players = new Map(targetState.players);
            this.gameState.bullets = [...targetState.bullets];
            return true;
        }
        
        return false;
    }

    // 获取反作弊统计信息
    getAntiCheatStats() {
        const stats = {
            totalSuspiciousActivities: 0,
            playerStats: {}
        };
        
        this.antiCheat.suspiciousActivities.forEach((activities, playerId) => {
            stats.totalSuspiciousActivities += activities.length;
            stats.playerStats[playerId] = {
                suspiciousCount: activities.length,
                recentActivities: activities.slice(-5) // 最近5个可疑活动
            };
        });
        
        return stats;
    }

    updatePlayer(player, deltaTime) {
        if (!player.input) return;

        // 使用物理引擎更新位置
        const updateResult = this.physics.updateTankPosition(player, player.input, deltaTime);
        
        // 处理射击
        if (player.input.fire && this.canPlayerFire(player)) {
            this.firePlayerBullet(player);
        }
        
        return updateResult;
    }

    canPlayerFire(player) {
        const now = Date.now();
        const playerBullets = this.gameState.bullets.filter(b => b.ownerId === player.id && b.active);
        return (now - player.lastFireTime >= this.config.FIRE_COOLDOWN) && 
               (playerBullets.length < this.config.MAX_BULLETS);
    }

    firePlayerBullet(player) {
        const now = Date.now();
        player.lastFireTime = now;
        
        const bulletX = player.x + Math.cos(player.angle) * (this.config.TANK_SIZE/2 + 5);
        const bulletY = player.y + Math.sin(player.angle) * (this.config.TANK_SIZE/2 + 5);
        
        this.gameState.bullets.push({
            id: 'bullet_' + now + '_' + Math.random().toString(36).substr(2, 9),
            x: bulletX,
            y: bulletY,
            angle: player.angle,
            velocityX: Math.cos(player.angle) * this.config.BULLET_SPEED,
            velocityY: Math.sin(player.angle) * this.config.BULLET_SPEED,
            ownerId: player.id,
            active: true,
            createdTime: now
        });
    }

    updateBullets(deltaTime) {
        this.gameState.bullets.forEach(bullet => {
            if (!bullet.active) return;
            
            // 使用物理引擎更新子弹位置
            this.physics.updateBulletPosition(bullet, deltaTime);
        });
    }

    detectCollisions() {
        const collisionEvents = [];
        
        // 子弹与坦克碰撞（使用物理引擎）
        this.gameState.bullets.forEach(bullet => {
            if (!bullet.active) return;

            this.gameState.players.forEach(player => {
                if (player.id === bullet.ownerId) return; // 不能击中自己

                if (this.physics.detectBulletTankCollision(bullet, player)) {
                    // 命中！
                    bullet.active = false;
                    const oldHealth = player.health;
                    player.health -= this.config.BULLET_DAMAGE;
                    
                    if (player.health < 0) {
                        player.health = 0;
                    }

                    // 增加射击者得分
                    const shooter = this.gameState.players.get(bullet.ownerId);
                    if (shooter) {
                        shooter.score++;
                    }
                    
                    // 记录碰撞事件
                    collisionEvents.push({
                        type: 'bullet_hit',
                        bulletId: bullet.id,
                        targetId: player.id,
                        shooterId: bullet.ownerId,
                        damage: this.config.BULLET_DAMAGE,
                        oldHealth: oldHealth,
                        newHealth: player.health,
                        timestamp: Date.now()
                    });
                }
            });
        });

        // 坦克与坦克碰撞（使用物理引擎）
        const players = Array.from(this.gameState.players.values());
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const player1 = players[i];
                const player2 = players[j];

                if (this.physics.detectTankTankCollision(player1, player2)) {
                    // 使用物理引擎解决碰撞
                    this.physics.resolveTankCollision(player1, player2);
                    
                    collisionEvents.push({
                        type: 'tank_collision',
                        player1Id: player1.id,
                        player2Id: player2.id,
                        timestamp: Date.now()
                    });
                }
            }
        }
        
        return collisionEvents;
    }

    checkGameEnd() {
        // 检查是否有玩家死亡
        for (const [playerId, player] of this.gameState.players) {
            if (player.health <= 0) {
                // 找到获胜者
                for (const [winnerId, winner] of this.gameState.players) {
                    if (winnerId !== playerId && winner.health > 0) {
                        return {
                            winnerId: winnerId,
                            winnerScore: winner.score,
                            loserId: playerId
                        };
                    }
                }
            }
        }
        return null;
    }

    serializeGameState() {
        const players = {};
        this.gameState.players.forEach((player, playerId) => {
            players[playerId] = {
                id: player.id,
                x: player.x,
                y: player.y,
                angle: player.angle,
                color: player.color,
                health: player.health,
                score: player.score
            };
        });

        return {
            players: players,
            bullets: this.gameState.bullets.filter(b => b.active).map(bullet => ({
                id: bullet.id,
                x: bullet.x,
                y: bullet.y,
                angle: bullet.angle,
                ownerId: bullet.ownerId
            })),
            gameTime: this.gameState.gameTime,
            running: this.gameState.running
        };
    }

    // 获取玩家输入历史（用于客户端预测校正）
    getPlayerInputHistory(playerId, fromSequence) {
        const history = this.inputHistory.get(playerId) || [];
        return history.filter(input => input.sequence > fromSequence);
    }

    // 重置游戏状态
    reset() {
        this.gameState = {
            players: new Map(),
            bullets: [],
            gameTime: 0,
            running: false
        };
        this.inputHistory.clear();
    }
}

module.exports = GameEngine;