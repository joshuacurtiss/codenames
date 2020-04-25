const bodyParser = require('body-parser')
const express = require('express')
const history = require('connect-history-api-fallback')
const http = require('http')
const path = require('path')
const { resolve } = require('path')

const PORT = process.env.PORT || 3000

const api = require('./api')
const websockets = require('./websockets')

const app = express()
const server = http.createServer(app)

// WebSockets
app.use(websockets({ server }, PORT))

// API
app.use(bodyParser.json())
app.use('/api', api)

// UI
const publicPath = resolve(__dirname, '../../dist')
const staticConf = { maxAge: '1y', etag: false }

app.use(express.static(publicPath, staticConf))
app.get('/:name', (req, res) => {
    res.sendFile('/index.html', {
        root: path.join(__dirname, '..', '..', 'dist')
    })
})
app.use('/', history())

// Go
server.listen(PORT, () => console.log(`App running on port ${PORT}!`))
