var express = require('express')
var router = express.Router()

router.get('/', (req, res) => {
    res.send('This will be an API.')
})

module.exports = router
