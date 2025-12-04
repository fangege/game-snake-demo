# 客户端预测系统规范

## ADDED Requirements

### 预测框架

### Requirement: 输入缓冲系统
客户端 MUST 维护输入历史缓冲区，用于状态回滚和重放。

#### Scenario: 输入序列管理
```javascript
Given 客户端接收到玩家输入
When 处理输入事件
Then 为输入分配递增的序列号
And 记录输入时间戳
And 将输入添加到缓冲区
And 保持缓冲区大小在合理范围内（如最近100个输入）
```

#### Scenario: 输入缓冲区清理
```javascript
Given 输入缓冲区达到最大容量
When 添加新的输入
Then 移除最旧的已确认输入
And 保留未确认的输入用于可能的重放
And 确保缓冲区不会无限增长
```

### Requirement: 本地状态预测
客户端 MUST 能够立即应用玩家输入，无需等待服务端确认。

#### Scenario: 即时移动预测
```javascript
Given 玩家按下移动键
When 客户端接收到输入
Then 立即计算新的坦克位置
And 更新本地显示状态
And 发送输入到服务端
And 将预测状态保存到历史记录
```

#### Scenario: 射击预测
```javascript
Given 玩家按下射击键
And 坦克满足射击条件（弹药、冷却时间）
When 客户端处理射击输入
Then 立即播放射击动画和音效
And 创建本地预测的子弹对象
And 发送射击指令到服务端
And 等待服务端确认实际命中结果
```

### 状态管理

### Requirement: 多状态维护
客户端 MUST 同时维护多个游戏状态版本。

#### Scenario: 状态版本管理
```javascript
Given 客户端运行中
When 管理游戏状态
Then 维护当前显示状态（包含预测）
And 维护最后确认的服务端状态
And 维护状态历史记录（用于回滚）
And 每个状态关联对应的输入序列号
```

### Requirement: 状态历史记录
客户端 MUST 保存状态历史，支持回滚到任意历史点。

#### Scenario: 状态快照保存
```javascript
Given 客户端应用了新的输入
When 更新游戏状态
Then 创建当前状态的快照
And 关联输入序列号和时间戳
And 添加到状态历史队列
And 限制历史记录数量防止内存溢出
```

### 服务端校正处理

### Requirement: 状态校正检测
客户端 MUST 能够检测服务端状态与本地预测状态的差异。

#### Scenario: 状态差异检测
```javascript
Given 收到服务端状态更新
When 比较服务端状态与对应的本地状态
Then 计算位置、角度、生命值等关键属性的差异
And 如果差异超过阈值，标记需要校正
And 记录校正统计信息用于调试
```

#### Scenario: 可接受误差处理
```javascript
Given 服务端状态与本地状态存在小幅差异
When 差异在可接受范围内（如位置差异<2像素）
Then 不执行校正操作
And 平滑插值到服务端状态
And 避免频繁的视觉跳跃
```

### Requirement: 状态回滚机制
当检测到预测错误时，客户端 MUST 能够回滚到服务端权威状态。

#### Scenario: 回滚到服务端状态
```javascript
Given 检测到需要状态校正
When 执行回滚操作
Then 找到对应序列号的历史状态
And 将游戏状态重置为服务端提供的权威状态
And 清除该时间点之后的预测状态
And 准备重新应用后续输入
```

### Requirement: 输入重放系统
回滚后，客户端 MUST 重新应用后续的输入以恢复到当前时间。

#### Scenario: 输入重放执行
```javascript
Given 已回滚到服务端状态
When 执行输入重放
Then 按时间顺序重新应用回滚点之后的所有输入
And 重新计算每一帧的游戏状态
And 更新到最新的预测状态
And 确保重放过程中的确定性计算
```

### 网络通信

### Requirement: 输入上传协议
客户端 MUST 将玩家输入及时发送到服务端。

#### Scenario: 输入消息发送
```javascript
Given 玩家产生输入事件
When 发送输入到服务端
Then 消息包含输入序列号
And 包含客户端时间戳
And 包含具体的输入内容（按键状态）
And 使用可靠传输确保消息到达
```

### Requirement: 状态更新接收
客户端 MUST 接收并处理服务端的状态更新。

#### Scenario: 服务端状态处理
```javascript
Given 收到服务端状态更新消息
When 处理状态更新
Then 提取服务端时间戳
And 提取确认的输入序列号
And 提取权威游戏状态数据
And 触发状态校正检查流程
```

### 时间同步

### Requirement: 客户端-服务端时间同步
客户端 MUST 与服务端保持时间同步，用于准确的延迟补偿。

#### Scenario: 时间偏移计算
```javascript
Given 客户端与服务端通信
When 发送时间同步请求
Then 记录发送时间 t1
And 接收服务端时间 server_time
And 记录接收时间 t2
And 计算往返延迟 rtt = t2 - t1
And 估算时间偏移 offset = server_time - (t1 + rtt/2)
```

### Requirement: 延迟补偿
客户端 MUST 根据网络延迟调整显示效果。

#### Scenario: 延迟补偿计算
```javascript
Given 已知客户端到服务端的延迟
When 渲染其他玩家的状态
Then 根据延迟时间外推其他玩家的位置
And 使用平滑插值避免突兀的位置跳跃
And 考虑延迟变化动态调整补偿算法
```

### 性能优化

### Requirement: 预测计算优化
客户端预测系统 MUST 保持高性能，不影响游戏流畅度。

#### Scenario: 计算性能控制
```javascript
Given 客户端执行预测计算
When 计算负载过高
Then 限制状态历史记录数量
And 优化物理计算算法
And 使用增量计算减少重复工作
And 确保帧率保持在目标值以上
```

### Requirement: 内存管理
预测系统 MUST 合理管理内存使用，避免内存泄漏。

#### Scenario: 内存使用控制
```javascript
Given 预测系统长时间运行
When 监控内存使用情况
Then 定期清理过期的状态历史
And 重用对象减少垃圾回收压力
And 限制缓冲区大小防止内存溢出
And 监控内存增长趋势
```

### 调试支持

### Requirement: 预测调试信息
系统 MUST 提供调试信息帮助开发者分析预测系统的工作状态。

#### Scenario: 调试面板显示
```javascript
Given 启用调试模式
When 显示调试信息
Then 显示当前预测准确率
And 显示状态校正频率
And 显示网络延迟统计
And 显示输入缓冲区状态
And 提供状态历史查看功能
```

#### Scenario: 预测错误统计
```javascript
Given 系统检测到预测错误
When 记录错误信息
Then 统计预测错误的类型和频率
And 记录错误发生的游戏场景
And 分析错误模式帮助优化算法
And 提供错误报告用于调试
```

### 用户体验

### Requirement: 平滑视觉效果
预测系统 MUST 提供平滑的视觉体验，避免突兀的状态跳跃。

#### Scenario: 校正平滑处理
```javascript
Given 需要执行状态校正
When 应用服务端状态
Then 使用平滑插值而非瞬间跳跃
And 在几帧内逐渐过渡到正确状态
And 保持视觉连续性
And 最小化对玩家体验的影响
```

### Requirement: 响应性保证
即使在网络延迟较高的情况下，本地操作也 MUST 保持即时响应。

#### Scenario: 高延迟环境响应
```javascript
Given 网络延迟超过100ms
When 玩家执行操作
Then 本地立即响应玩家输入
And 显示预测的操作结果
And 在后台等待服务端确认
And 必要时执行平滑的状态校正
```