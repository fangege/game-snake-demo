'use strict'

const WebSocketServer = require('ws').Server

module.exports = (server) => {
  let wss = new WebSocketServer({ server: server })


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
    let loopEvent = {
      type:"broadcast",
      turn: gameState.turn,
      event:gameState.current_event,
      gameTime:new Date().getMilliseconds() - gameState.gameStartTime
    }
    gameState.turn_event_list.unshift(loopEvent)

      wss.broadcast(JSON.stringify(loopEvent))

    gameState.current_event = {}
  }

  wss.broadcast = function (data) {
    wss.clients.forEach(function (client) {
      client.send(data)
    })
  }

  wss.isUsernameAvailable = function (str) {
    if (!str || typeof str !== 'string') return false
    for (let client of wss.clients) {
      if (new RegExp('^' + client.username + '$', 'i').test(str)) return false
    }
    return true
  }

  wss.on('connection', function (socket) {
    console.log("connection...")
    socket.on('message', function (message) {
      try {
        message = JSON.parse(message)
      } catch (e) {
        console.log(e.message)
      }
      console.log(message)
      if(message.type==="start"){
        if( gameState.gameStartTime === 0 ){
          gameState.gameStartTime = new Date().getMilliseconds()
          gameLoopInterval = setInterval(gameLoop, 500); // 5秒后执行
          wss.broadcast(JSON.stringify(({type:"start"})))
        }
        return
      }

      if(message.type==="keyboard"){
        gameState.current_event["player1"] = message
      }

      if(message.type==="end"){
        gameState.gameStartTime = 0
        gameState.gameEndTime = new Date().getMilliseconds()
        wss.broadcast({type:"end"})
        for(let turn of gameState.turn_event_list){
          if(turn.event.length!==0){
            console.log(JSON.stringify(turn.event))
          }
        }
        console.log(JSON.stringify(gameState.turn_event_list))
        clearInterval(gameLoopInterval)
        return
      }

      if(message.type === "state"){
        if(message.turn >= gameState.turn){
          socket.send(JSON.stringify({type:"state"}))
          return
        }
        let result = []
        for(let event of gameState.turn_event_list){
          if(event.turn > message.turn){
            result.unshift(event)
          }
        }
        socket.send(JSON.stringify({type:"state",result:result}))
        return
      }
    })

    socket.on('close', function () {
      console.log("close...")
      if (socket.username) {
        wss.broadcast('@' + socket.username + ' logged out.')
      }
    })
  })
}
