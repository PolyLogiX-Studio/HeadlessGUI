const EventEmitter = require('events')
const emitter = new EventEmitter()

emitter.on('uncaughtException', function (err) {
	console.log(err)
})
module.exports = emitter