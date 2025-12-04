# 服务端权威系统规范

## ADDED Requirements

### 权威状态管理

### Requirement: 游戏状态权威性
服务端 MUST 维护游戏的权威状态，所有关键决策由服务端做出。

#### Scenario: 权威状态维护
```javascript
Given 服务端运行游戏逻辑
When 处理游戏状态更新
Then 服务端状态为唯一权威来源
And 客户端状态仅用于显示和预测
And 所有争议以服务端状态为准
And 定期向客户端广播权威状态
```

### Requirement: 状态一致性保证
服务端 MUST 确保所有客户端最终收到一致的游戏状态。

#### Scenario: 状态同步广播
```javascript
Given 游戏状态发生变化
When 服务端更新权威状态
Then 向所有连接的客户端广播状态更新
And 确保消息的可靠传输
And 包含状态版本号用于同步验证
And 处理客户端的状态确认
```

### 输入验证与处理

### Requirement: 输入合法性验证
服务端 MUST 验证所有客户端输入的合法性，防止作弊和异常输入。

#### Scenario: 移动输入验证
```javascript
Given 收到客户端移动输入
When 验证输入合法性
Then 检查移动距离是否在合理范围内
And 验证移动方向是否符合物理约束
And 检查输入频率是否正常
And 拒绝明显异常的输入
```

#### Scenario: 射击输入验证
```javascript
Given 收到客户端射击输入
When 验证射击请求
Then 检查坦克是否有足够弹药
And 验证射击冷却时间是否满足
And 检查坦克是否处于可射击状态
And 验证射击频率是否在限制范围内
```

### Requirement: 输入时序处理
服务端 MUST 按正确的时间顺序处理客户端输入。

#### Scenario: 输入排序处理
```javascript
Given 收到多个客户端的输入
When 处理输入队列
Then 按输入时间戳排序
And 考虑网络延迟进行时间校正
And 按顺序应用到游戏状态
And 处理同时输入的冲突情况
```

### 物理计算与碰撞检测

### Requirement: 权威物理计算
服务端 MUST 执行权威的物理计算，确保游戏逻辑的一致性。

#### Scenario: 坦克移动计算
```javascript
Given 收到坦克移动输入
When 计算新位置
Then 使用确定性的物理算法
And 应用相同的时间步长
And 考虑碰撞和边界限制
And 确保计算结果可重现
```

### Requirement: 碰撞检测权威性
服务端 MUST 执行权威的碰撞检测，特别是涉及伤害的碰撞。

#### Scenario: 子弹命中判定
```javascript
Given 子弹在飞行路径上
When 检测与坦克的碰撞
Then 使用精确的碰撞检测算法
And 考虑子弹和坦克的实际大小
And 基于服务端时间进行判定
And 确定命中时的准确位置和时间
```

#### Scenario: 伤害计算处理
```javascript
Given 检测到子弹命中坦克
When 计算伤害结果
Then 应用武器的伤害值
And 考虑坦克的护甲值
And 更新坦克的生命值
And 检查坦克是否死亡
And 广播伤害事件给所有客户端
```

### 游戏循环与定时

### Requirement: 固定时间步长
服务端 MUST 使用固定的时间步长运行游戏循环，确保确定性。

#### Scenario: 游戏循环执行
```javascript
Given 服务端游戏循环运行
When 执行每一帧更新
Then 使用固定的时间间隔（如16.67ms for 60Hz）
And 处理累积的输入事件
And 更新所有游戏对象状态
And 执行物理计算和碰撞检测
And 广播状态更新给客户端
```

### Requirement: 性能监控
服务端 MUST 监控游戏循环的性能，确保稳定的帧率。

#### Scenario: 性能监控处理
```javascript
Given 游戏循环运行中
When 监控性能指标
Then 测量每帧的处理时间
And 监控CPU和内存使用率
And 检测性能瓶颈
And 在性能下降时发出警告
And 记录性能统计数据
```

### 客户端状态校正

### Requirement: 状态差异检测
服务端 MUST 能够检测客户端状态与权威状态的差异。

#### Scenario: 客户端状态验证
```javascript
Given 收到客户端状态信息
When 比较客户端和服务端状态
Then 计算位置、角度等关键属性的差异
And 识别超出容忍范围的偏差
And 记录偏差统计用于分析
And 决定是否需要发送校正信息
```

### Requirement: 校正消息发送
当检测到客户端状态偏差时，服务端 MUST 发送校正信息。

#### Scenario: 状态校正通知
```javascript
Given 检测到客户端状态偏差
When 发送校正消息
Then 包含权威的游戏状态数据
And 指定需要校正的输入序列号
And 包含校正的时间戳信息
And 使用可靠传输确保消息到达
```

### 网络通信管理

### Requirement: 连接管理
服务端 MUST 管理客户端连接，处理连接和断开事件。

#### Scenario: 客户端连接处理
```javascript
Given 新客户端尝试连接
When 处理连接请求
Then 验证客户端身份和版本
And 分配唯一的玩家ID
And 将玩家添加到游戏房间
And 发送初始游戏状态
And 通知其他玩家新玩家加入
```

#### Scenario: 客户端断开处理
```javascript
Given 客户端连接断开
When 处理断开事件
Then 从游戏中移除玩家
And 清理玩家相关的游戏对象
And 通知其他玩家该玩家离开
And 如果需要，暂停或结束游戏
```

### Requirement: 消息可靠性
服务端 MUST 确保关键消息的可靠传输。

#### Scenario: 关键消息确认
```javascript
Given 发送关键游戏消息（如伤害、死亡）
When 等待客户端确认
Then 设置消息超时时间
And 在未收到确认时重发消息
And 限制重发次数防止无限重试
And 记录消息传输统计
```

### 房间和匹配系统

### Requirement: 游戏房间管理
服务端 MUST 支持多个独立的游戏房间。

#### Scenario: 房间创建和管理
```javascript
Given 需要创建新的游戏房间
When 处理房间创建请求
Then 分配唯一的房间ID
And 初始化房间游戏状态
And 设置房间参数（最大玩家数等）
And 启动房间的游戏循环
And 管理房间的生命周期
```

### Requirement: 玩家匹配
服务端 MUST 支持玩家匹配和房间分配。

#### Scenario: 玩家匹配处理
```javascript
Given 玩家请求加入游戏
When 执行匹配逻辑
Then 查找可用的游戏房间
And 检查房间是否有空位
And 将玩家分配到合适的房间
And 如果没有可用房间，创建新房间
And 通知玩家匹配结果
```

### 数据持久化

### Requirement: 游戏统计记录
服务端 MUST 记录游戏统计数据用于分析。

#### Scenario: 统计数据收集
```javascript
Given 游戏进行中
When 发生关键事件（击杀、死亡等）
Then 记录事件时间和参与者
And 更新玩家统计数据
And 记录游戏性能指标
And 保存数据到持久化存储
```

### 安全性

### Requirement: 防作弊机制
服务端 MUST 实现防作弊机制，检测和阻止异常行为。

#### Scenario: 异常行为检测
```javascript
Given 监控玩家行为
When 检测到可疑活动
Then 分析移动速度是否异常
And 检查射击频率是否超限
And 监控输入模式是否像机器人
And 记录可疑行为用于分析
And 必要时采取限制措施
```

### Requirement: 输入频率限制
服务端 MUST 限制客户端输入频率，防止洪水攻击。

#### Scenario: 输入频率控制
```javascript
Given 收到客户端输入
When 检查输入频率
Then 统计单位时间内的输入数量
And 如果超过阈值，暂时忽略输入
And 记录频率异常事件
And 对恶意客户端实施限制
```

### 错误处理

### Requirement: 异常恢复
服务端 MUST 能够从各种异常情况中恢复。

#### Scenario: 游戏状态异常处理
```javascript
Given 检测到游戏状态异常
When 处理异常情况
Then 记录异常详细信息
And 尝试自动修复状态
And 如果无法修复，重置游戏
And 通知客户端状态重置
And 记录异常统计用于改进
```

### Requirement: 网络异常处理
服务端 MUST 处理各种网络异常情况。

#### Scenario: 网络中断处理
```javascript
Given 客户端网络连接不稳定
When 检测到连接问题
Then 暂时保留玩家状态
And 等待重连在合理时间内
And 如果超时，移除玩家
And 通知其他玩家连接状态
And 记录网络问题统计
```