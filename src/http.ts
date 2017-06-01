import { createServer } from 'http'

import * as express from 'express'
import * as morgan from 'morgan'
import * as helmet from 'helmet'
import * as bodyParser from 'body-parser'

import { N9Micro } from './index'

export default async function(options: N9Micro.Options): Promise<N9Micro.HttpContext> {
	// Default options
	options.http = options.http || {}
	options.http.port = options.http.port || process.env.PORT || 5000
	options.http.logLevel = (typeof options.http.logLevel !== 'undefined' ? options.http.logLevel : 'dev')
	// Create server & helpers
	const app = express()
	const server = createServer(app)
	// Listeners
	const analyzeError = (error) => {
		/* istanbul ignore if */
		if (error.syscall !== 'listen') {
			return error
		}
		// handle specific listen errors with friendly messages
		switch (error.code) {
			case 'EACCES':
				return new Error(`Port ${options.http.port} requires elevated privileges`)
			case 'EADDRINUSE':
				return new Error(`Port ${options.http.port} is already in use`)
			/* istanbul ignore next */
			default:
				return error
		}
	}
	const onListening = () => {
		const addr = server.address()
		options.log.info('Listening on port ' + addr.port)
	}
	// Listen method
	const listen = () => {
		return new Promise((resolve, reject) => {
			server.listen(options.http.port)
			server.on('error', (error) => {
				reject(analyzeError(error))
			})
			server.on('listening', () => {
				onListening()
				resolve()
			})
		})
	}
	// Middleware
	app.use(helmet())
	app.use(bodyParser.urlencoded({ extended: false }))
	app.use(bodyParser.json())
	// Logger middleware
	const stream = { write: (message) => options.log.info(message) }
	if (typeof options.http.logLevel === 'string') {
		app.use(morgan(options.http.logLevel, { stream }))
	}
	// Return app & server
	return { app, server, listen }
}
