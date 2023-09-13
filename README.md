## 背景
网络游戏同步的文章非常的多，但代码示例相对较少，有些代码示例需要 unity 或其他游戏引擎，引入了一定的学习难度，本项目旨在使用纯html5 实现网络游戏的同步方案。


## 单机版双人贪食蛇
实现代码在 html 目录下的 snake.html,该代码使用 chatGpt3.5 生成，直接在浏览器中打开即可运行。该代码实现了一个 web 端的双人简单贪食蛇游戏，player1 使用wsad键控制蛇的方向,player2 使用方向键，食物会随机产生。
代码的实现 input->stateCompute->state->view的模型，用户通过输入改变游戏状态，游戏状态数据体现到游戏 ui 上。


## 状态同步
对单机版的双人贪食蛇进行改造，相对而言，状态同步方案更容易实现，stateCompute 和 state 拆解到服务端，用户的输入同步给服务端，服务端实时计算更新状态，客户端按一定频率从服务端拉取最新状态并反应到 ui 上。

1. 服务端运行
```shell
node server/stat_sync/app.js
```
2. 客户端1(player1)运行
```shell
http://localhost:3000/snake?player=player1
```
3. 客户端2(player2)运行
```shell
http://localhose:3000/snake?player=player2
```
因为使用了cookie，可以用两个浏览器或者两台计算机测试

## http版帧同步
类似存储系统中的快照同步，状态同步是游戏的所有对象当前数据下发给每个客户端，相对而言，帧同步类似存储系统的增量同步，将每次会对游戏状态进行改变的操作下发给每个客户端。
本demo实现了基于 http 的简略版帧同步，服务端维护了一个操作流水队列，并将一局游戏周期采样成连续的 turn，客户端每次用户操作都将上报给服务器，服务器把每个turn内用户最后一次操作定义为本 turn 的操作并保存在操作流水中，因为使用http，无法直接广播，所以所有的客户端仍然定期请求服务器获取所有客户端的操作流水并在客户端重放，只要保证所有客户端的执行流水和服务器的权威操作流水是完全一致的，则游戏的最终状态也是一致的。

```shell
node server/lock_step_http/app.js
```
2. 客户端1(player1)运行
```shell
http://localhost:3000/snake?player=player1
```
3. 客户端2(player2)运行
```shell
http://localhose:3000/snake?player=player2
```



## websocket 版本 LockStep
todo

