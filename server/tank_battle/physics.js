// 物理引擎 - 确定性物理计算，确保客户端和服务端结果一致
class PhysicsEngine {
    constructor(config) {
        this.config = config;
    }

    // 更新坦克位置（确定性计算）
    updateTankPosition(tank, input, deltaTime) {
        const originalX = tank.x;
        const originalY = tank.y;
        const originalAngle = tank.angle;

        // 处理旋转（旋转优先，避免移动时的角度不一致）
        if (input.turnLeft) {
            tank.angle -= this.config.TANK_TURN_SPEED;
        }
        if (input.turnRight) {
            tank.angle += this.config.TANK_TURN_SPEED;
        }

        // 标准化角度到 [0, 2π] 范围
        tank.angle = this.normalizeAngle(tank.angle);

        // 处理移动
        let newX = tank.x;
        let newY = tank.y;

        if (input.forward) {
            newX += Math.cos(tank.angle) * this.config.TANK_SPEED;
            newY += Math.sin(tank.angle) * this.config.TANK_SPEED;
        }
        
        if (input.backward) {
            newX -= Math.cos(tank.angle) * this.config.TANK_SPEED * 0.7;
            newY -= Math.sin(tank.angle) * this.config.TANK_SPEED * 0.7;
        }

        // 边界检测和碰撞检测
        const validPosition = this.validatePosition(newX, newY, tank.id);
        if (validPosition.valid) {
            tank.x = validPosition.x;
            tank.y = validPosition.y;
        }

        return {
            moved: tank.x !== originalX || tank.y !== originalY || tank.angle !== originalAngle,
            position: { x: tank.x, y: tank.y, angle: tank.angle }
        };
    }

    // 标准化角度
    normalizeAngle(angle) {
        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        return angle;
    }

    // 验证位置是否有效（边界检测）
    validatePosition(x, y, tankId) {
        const halfSize = this.config.TANK_SIZE / 2;
        
        // 边界限制
        const clampedX = Math.max(halfSize, Math.min(this.config.CANVAS_WIDTH - halfSize, x));
        const clampedY = Math.max(halfSize, Math.min(this.config.CANVAS_HEIGHT - halfSize, y));
        
        return {
            valid: true,
            x: clampedX,
            y: clampedY
        };
    }

    // 更新子弹位置
    updateBulletPosition(bullet, deltaTime) {
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;

        // 边界检测
        if (bullet.x < 0 || bullet.x > this.config.CANVAS_WIDTH || 
            bullet.y < 0 || bullet.y > this.config.CANVAS_HEIGHT) {
            bullet.active = false;
        }

        // 生存时间检测
        if (Date.now() - bullet.createdTime > 5000) {
            bullet.active = false;
        }

        return bullet;
    }

    // 检测圆形与矩形碰撞（子弹与坦克）
    circleRectCollision(circle, rect) {
        const dx = Math.abs(circle.x - rect.x);
        const dy = Math.abs(circle.y - rect.y);
        
        const rectHalfWidth = this.config.TANK_SIZE / 2;
        const rectHalfHeight = this.config.TANK_SIZE / 2;
        
        if (dx > (rectHalfWidth + circle.radius)) return false;
        if (dy > (rectHalfHeight + circle.radius)) return false;
        
        if (dx <= rectHalfWidth) return true;
        if (dy <= rectHalfHeight) return true;
        
        const cornerDistance = Math.pow(dx - rectHalfWidth, 2) + Math.pow(dy - rectHalfHeight, 2);
        return cornerDistance <= Math.pow(circle.radius, 2);
    }

    // 检测子弹与坦克碰撞
    detectBulletTankCollision(bullet, tank) {
        const circle = {
            x: bullet.x,
            y: bullet.y,
            radius: this.config.BULLET_SIZE
        };
        
        const rect = {
            x: tank.x,
            y: tank.y
        };
        
        return this.circleRectCollision(circle, rect);
    }

    // 检测坦克与坦克碰撞
    detectTankTankCollision(tank1, tank2) {
        const dx = tank1.x - tank2.x;
        const dy = tank1.y - tank2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < this.config.TANK_SIZE;
    }

    // 解决坦克碰撞（推开）
    resolveTankCollision(tank1, tank2) {
        const dx = tank1.x - tank2.x;
        const dy = tank1.y - tank2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.config.TANK_SIZE && distance > 0) {
            const angle = Math.atan2(dy, dx);
            const pushDistance = (this.config.TANK_SIZE - distance) / 2;
            
            // 推开两个坦克
            const pushX = Math.cos(angle) * pushDistance;
            const pushY = Math.sin(angle) * pushDistance;
            
            tank1.x += pushX;
            tank1.y += pushY;
            tank2.x -= pushX;
            tank2.y -= pushY;
            
            // 确保坦克在边界内
            const halfSize = this.config.TANK_SIZE / 2;
            
            tank1.x = Math.max(halfSize, Math.min(this.config.CANVAS_WIDTH - halfSize, tank1.x));
            tank1.y = Math.max(halfSize, Math.min(this.config.CANVAS_HEIGHT - halfSize, tank1.y));
            tank2.x = Math.max(halfSize, Math.min(this.config.CANVAS_WIDTH - halfSize, tank2.x));
            tank2.y = Math.max(halfSize, Math.min(this.config.CANVAS_HEIGHT - halfSize, tank2.y));
        }
    }

    // 计算子弹轨迹预测（用于命中判定优化）
    predictBulletPath(bullet, steps = 10) {
        const path = [];
        let x = bullet.x;
        let y = bullet.y;
        
        for (let i = 0; i < steps; i++) {
            x += bullet.velocityX;
            y += bullet.velocityY;
            
            path.push({ x, y });
            
            // 如果超出边界，停止预测
            if (x < 0 || x > this.config.CANVAS_WIDTH || 
                y < 0 || y > this.config.CANVAS_HEIGHT) {
                break;
            }
        }
        
        return path;
    }

    // 延迟补偿 - 根据网络延迟回溯状态
    compensateForLatency(gameState, latency) {
        // 简单的线性外推补偿
        const compensationTime = latency / 2; // 单程延迟估算
        const compensationFactor = compensationTime / 1000; // 转换为秒
        
        const compensatedState = JSON.parse(JSON.stringify(gameState)); // 深拷贝
        
        // 补偿坦克位置
        Object.values(compensatedState.players).forEach(player => {
            if (player.input) {
                if (player.input.forward) {
                    player.x += Math.cos(player.angle) * this.config.TANK_SPEED * compensationFactor * 60;
                    player.y += Math.sin(player.angle) * this.config.TANK_SPEED * compensationFactor * 60;
                }
                if (player.input.backward) {
                    player.x -= Math.cos(player.angle) * this.config.TANK_SPEED * 0.7 * compensationFactor * 60;
                    player.y -= Math.sin(player.angle) * this.config.TANK_SPEED * 0.7 * compensationFactor * 60;
                }
                if (player.input.turnLeft) {
                    player.angle -= this.config.TANK_TURN_SPEED * compensationFactor * 60;
                }
                if (player.input.turnRight) {
                    player.angle += this.config.TANK_TURN_SPEED * compensationFactor * 60;
                }
            }
        });
        
        // 补偿子弹位置
        compensatedState.bullets.forEach(bullet => {
            bullet.x += bullet.velocityX * compensationFactor * 60;
            bullet.y += bullet.velocityY * compensationFactor * 60;
        });
        
        return compensatedState;
    }

    // 验证输入的合法性（防作弊）
    validateInput(input, previousInput, deltaTime) {
        // 检查输入格式
        if (typeof input !== 'object') return false;
        
        const validKeys = ['forward', 'backward', 'turnLeft', 'turnRight', 'fire'];
        for (const key of validKeys) {
            if (typeof input[key] !== 'boolean') return false;
        }
        
        // 检查逻辑冲突（同时前进后退等）
        if (input.forward && input.backward) return false;
        if (input.turnLeft && input.turnRight) return false;
        
        // 检查输入频率（防止过快输入）
        if (deltaTime < 10) return false; // 最小10ms间隔
        
        return true;
    }

    // 计算游戏状态哈希（用于状态验证）
    calculateStateHash(gameState) {
        const stateString = JSON.stringify({
            players: Object.fromEntries(
                Object.entries(gameState.players).map(([id, player]) => [
                    id, 
                    {
                        x: Math.round(player.x * 100) / 100,
                        y: Math.round(player.y * 100) / 100,
                        angle: Math.round(player.angle * 1000) / 1000,
                        health: player.health,
                        score: player.score
                    }
                ])
            ),
            bullets: gameState.bullets.map(bullet => ({
                x: Math.round(bullet.x * 100) / 100,
                y: Math.round(bullet.y * 100) / 100,
                ownerId: bullet.ownerId
            }))
        });
        
        // 简单哈希函数
        let hash = 0;
        for (let i = 0; i < stateString.length; i++) {
            const char = stateString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return hash;
    }

    // 插值函数 - 用于平滑状态过渡
    interpolateState(fromState, toState, factor) {
        const interpolated = JSON.parse(JSON.stringify(fromState));
        
        // 插值坦克位置
        Object.keys(interpolated.players).forEach(playerId => {
            if (toState.players[playerId]) {
                const from = fromState.players[playerId];
                const to = toState.players[playerId];
                
                interpolated.players[playerId].x = this.lerp(from.x, to.x, factor);
                interpolated.players[playerId].y = this.lerp(from.y, to.y, factor);
                interpolated.players[playerId].angle = this.lerpAngle(from.angle, to.angle, factor);
            }
        });
        
        return interpolated;
    }

    // 线性插值
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // 角度插值（处理角度环绕）
    lerpAngle(a, b, t) {
        const diff = b - a;
        const shortestAngle = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
        return a + shortestAngle * t;
    }
}

module.exports = PhysicsEngine;