const bodyParser = require('body-parser')
const webpack = require('webpack')

const api = require('./src/server/api')
const pkg = require('./package.json')
const websockets = require('./src/server/websockets')

module.exports = {
    configureWebpack: {
        plugins: [
            new webpack.DefinePlugin({
                'process.env': {
                    PACKAGE_VERSION: '"' + (pkg.version || 0) + '"'
                }
            })
        ]
    },
    devServer: {
        before (app) {
            app.use(bodyParser.json())
            app.use(websockets({ port: process.env.WSSPORT || 8888 }))
            app.use('/api', api)
        },
        port: process.env.PORT || 3000
    }
}
