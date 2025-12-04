# 坦克大战核心游戏系统规范

## ADDED Requirements

### 游戏对象模型

### Requirement: 坦克对象定义
系统 MUST 定义坦克游戏对象，包含位置、状态和行为属性。

#### Scenario: 创建坦克实例
```javascript
Given 游戏初始化
When 创建新的坦克对象
Then 坦克对象包含以下属性：
  - id: 唯一标识符
  - x, y: 位置坐标
  - angle: 车身角度
  - turretAngle: 炮塔角度
  - speed: 移动速度
  - health: 生命值
  - maxHealth: 最大生命值
  - ammo: 弹药数量
  - maxAmmo: 最大弹药数量
  - lastFireTime: 上次开火时间
  - isAlive: 存活状态
```

### Requirement: 子弹对象定义
系统 MUST 定义子弹游戏对象，用于处理射击机制。

#### Scenario: 发射子弹
```javascript
Given 坦克准备射击
When 玩家按下射击键
Then 创建子弹对象包含：
  - id: 唯一标识符
  - x, y: 初始位置（炮口位置）
  - vx, vy: 速度向量
  - ownerId: 发射者ID
  - damage: 伤害值
  - lifeTime: 存活时间
  - maxRange: 最大射程
```

### 游戏机制

### Requirement: 坦克移动控制
系统 MUST 支持坦克的移动和旋转控制。

#### Scenario: 坦克前进移动
```javascript
Given 坦克在游戏场景中
When 玩家按下前进键（W或方向键上）
Then 坦克按当前角度方向移动
And 移动距离 = 速度 × 时间间隔
And 坐标更新：x += cos(angle) × distance, y += sin(angle) × distance
```

#### Scenario: 坦克旋转控制
```javascript
Given 坦克在游戏场景中
When 玩家按下左转键（A或方向键左）
Then 坦克角度减少：angle -= turnSpeed × deltaTime
And 角度值保持在 0-2π 范围内
```

### Requirement: 炮塔独立控制
系统 MUST 支持炮塔独立于车身的旋转控制。

#### Scenario: 炮塔旋转
```javascript
Given 坦克存在于游戏中
When 玩家控制炮塔旋转（鼠标移动或Q/E键）
Then 炮塔角度独立更新
And 炮塔角度与车身角度可以不同
And 射击方向基于炮塔角度计算
```

### Requirement: 射击系统
系统 MUST 实现射击机制，包括冷却时间和弹药限制。

#### Scenario: 成功射击
```javascript
Given 坦克有足够弹药
And 射击冷却时间已过
When 玩家按下射击键（空格键）
Then 消耗1发弹药
And 在炮口位置创建子弹
And 子弹按炮塔角度方向飞行
And 记录射击时间用于冷却计算
```

#### Scenario: 射击冷却限制
```javascript
Given 坦克刚刚射击
When 玩家在冷却时间内再次按射击键
Then 射击请求被忽略
And 不消耗弹药
And 不创建子弹
```

### 碰撞检测

### Requirement: 边界碰撞
系统 MUST 检测并处理坦克与游戏边界的碰撞。

#### Scenario: 坦克撞击边界
```javascript
Given 坦克移动到游戏区域边缘
When 坦克位置超出边界
Then 坦克位置被限制在边界内
And 坦克停止移动
And 可选择反弹效果
```

### Requirement: 子弹碰撞检测
系统 MUST 检测子弹与坦克的碰撞。

#### Scenario: 子弹命中坦克
```javascript
Given 子弹在飞行中
And 敌方坦克在射击路径上
When 子弹与坦克发生碰撞
Then 坦克生命值减少子弹伤害值
And 子弹被销毁
And 触发命中特效
And 如果坦克生命值<=0，坦克死亡
```

#### Scenario: 子弹超出射程
```javascript
Given 子弹在飞行中
When 子弹飞行距离超过最大射程
Or 子弹飞行时间超过生存时间
Then 子弹自动销毁
And 不造成任何伤害
```

### 游戏状态管理

### Requirement: 游戏生命周期
系统 MUST 管理游戏的开始、进行和结束状态。

#### Scenario: 游戏开始
```javascript
Given 两名玩家连接到游戏
When 游戏开始指令发出
Then 初始化两个坦克在指定位置
And 重置所有游戏状态（生命值、弹药、得分）
And 开始游戏循环
And 启用玩家输入处理
```

#### Scenario: 游戏结束条件
```javascript
Given 游戏正在进行中
When 其中一个坦克生命值降为0
Then 游戏进入结束状态
And 显示胜负结果
And 停止接受玩家输入
And 提供重新开始选项
```

### Requirement: 得分系统
系统 MUST 跟踪和显示玩家得分。

#### Scenario: 击杀得分
```javascript
Given 玩家A的子弹击中玩家B的坦克
When 玩家B的坦克生命值降为0
Then 玩家A得分增加1
And 更新得分显示
And 记录击杀统计
```

### 渲染系统

### Requirement: Canvas渲染
系统 MUST 使用HTML5 Canvas进行游戏渲染。

#### Scenario: 坦克渲染
```javascript
Given 游戏状态包含坦克数据
When 执行渲染循环
Then 在Canvas上绘制坦克车身（矩形）
And 绘制坦克炮塔（线条或小矩形）
And 使用不同颜色区分不同玩家
And 根据坦克角度正确旋转图形
```

#### Scenario: 子弹渲染
```javascript
Given 游戏中存在飞行的子弹
When 执行渲染循环
Then 在子弹位置绘制小圆点或线条
And 使用明显颜色便于观察
And 可选择绘制子弹轨迹
```

### Requirement: UI界面
系统 MUST 显示游戏相关的用户界面信息。

#### Scenario: 状态信息显示
```javascript
Given 游戏正在运行
When 渲染UI界面
Then 显示每个玩家的生命值条
And 显示当前弹药数量
And 显示玩家得分
And 显示游戏时间（可选）
```

### 输入处理

### Requirement: 键盘输入映射
系统 MUST 支持双人键盘控制方案。

#### Scenario: 玩家1控制映射
```javascript
Given 玩家1使用WASD控制方案
When 检测到键盘输入
Then W键 -> 前进
And S键 -> 后退
And A键 -> 左转
And D键 -> 右转
And Q键 -> 炮塔左转
And E键 -> 炮塔右转
And 空格键 -> 射击
```

#### Scenario: 玩家2控制映射
```javascript
Given 玩家2使用方向键控制方案
When 检测到键盘输入
Then 方向键上 -> 前进
And 方向键下 -> 后退
And 方向键左 -> 左转
And 方向键右 -> 右转
And 数字键1 -> 炮塔左转
And 数字键2 -> 炮塔右转
And 回车键 -> 射击
```