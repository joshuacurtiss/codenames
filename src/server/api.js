var express = require('express')
var router = express.Router()

router.get('/', (req, res) => {
    res.send('This is an API.')
})

router.get('/settings', (req, res) => {
    res.json({
        wssport: req.wss.port
    })
})

module.exports = router
