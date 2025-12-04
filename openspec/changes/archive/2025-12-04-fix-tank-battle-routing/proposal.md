# 提案：修复坦克大战路由问题

## Why

当前坦克大战服务器存在路由配置问题，访问 `http://localhost:3003/tank_battle` 时浏览器会下载文件而不是显示网页。

**问题分析**：
1. **错误的响应方式**：当前使用 `res.sendFile()` 直接发送 `.ejs` 文件
2. **缺少模板引擎配置**：Express应用没有配置EJS模板引擎
3. **文件类型识别错误**：浏览器将 `.ejs` 文件识别为下载文件而非HTML

**根本原因**：
- `res.sendFile(path.join(__dirname, 'client_prediction.ejs'))` 会直接发送EJS源码
- 应该使用 `res.render('client_prediction')` 来渲染EJS模板为HTML
- 需要配置Express的视图引擎和视图目录

## What Changes

### 服务器配置修复
1. **添加EJS模板引擎配置**
   - 设置视图引擎为EJS
   - 配置视图文件目录
   - 确保EJS依赖可用

2. **修复路由处理**
   - 将 `res.sendFile()` 改为 `res.render()`
   - 正确渲染EJS模板为HTML响应
   - 确保Content-Type为text/html

3. **验证修复效果**
   - 确保访问URL显示网页而非下载文件
   - 验证WebSocket连接正常工作
   - 确保游戏功能完整

### 影响范围
- **文件修改**：`server/tank_battle/app.js`
- **功能影响**：坦克大战网页访问
- **用户体验**：从"下载文件"改为"正常显示游戏页面"

### 技术细节
```javascript
// 当前问题代码
app.get('/tank_battle', (req, res) => {
    res.sendFile(path.join(__dirname, 'client_prediction.ejs'));
});

// 修复后代码
app.set('view engine', 'ejs');
app.set('views', __dirname);

app.get('/tank_battle', (req, res) => {
    res.render('client_prediction');
});
```

## 成功标准

1. **功能正常**：访问 `http://localhost:3003/tank_battle` 显示游戏页面
2. **无下载行为**：浏览器不再提示下载文件
3. **游戏可玩**：客户端预测系统正常工作
4. **WebSocket连接**：实时通信功能正常

## 风险评估

- **风险等级**：低
- **影响范围**：仅限坦克大战路由
- **回滚方案**：简单，只需恢复原始路由代码
- **测试需求**：手动测试访问URL和游戏功能