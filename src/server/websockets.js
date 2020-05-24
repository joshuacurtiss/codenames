const WebSocket = require('ws')
const uuidv4 = require('uuid').v4

const PINGTIME = 60000

exports = module.exports = options => {
    const wss = new WebSocket.Server(options)
    const interval = setInterval(() => {
        wss.clients.forEach(ws => {
            if (!ws.alive) return ws.terminate()
            ws.alive = false
            ws.ping()
        })
    }, PINGTIME)
    wss.on('connection', (ws, req) => {
        const name = req.url.slice(1)
        ws.uuid = uuidv4()
        ws.name = name
        ws.alive = true
        ws.on('message', data => {
            const result = JSON.parse(data)
            // Ignore pings
            if (result.action === 'ping') return
            broadcast(data, ws.name, ws.uuid)
        })
        ws.on('pong', pong)
        broadcast(JSON.stringify({ action: 'sync' }), ws.name, ws.uuid)
    })
    wss.on('close', () => {
        clearInterval(interval)
    })
    function pong () {
        this.alive = true
    }
    function broadcast (data, name = '', uuid = '') {
        wss.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN && (ws.name === name || name.length === 0) && ws.uuid !== uuid) ws.send(data)
        })
    }
    return function (req, res, next) {
        req.wss = {
            server: wss,
            broadcast,
            port: options.port || null
        }
        next()
    }
}
