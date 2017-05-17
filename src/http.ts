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
	options.http.logLevel = options.http.logLevel || 'dev'
	// Create server & helpers
	const app = express()
	const server = createServer(app)
	// Listeners
	const onError = (error) => {
		/* istanbul ignore if */
		if (error.syscall !== 'listen') {
			throw error
		}
		// handle specific listen errors with friendly messages
		switch (error.code) {
			case 'EACCES':
				options.log.error(`Port ${options.http.port} requires elevated privileges`)
				process.exit(1)
				break
			case 'EADDRINUSE':
				options.log.error(`Port ${options.http.port} is already in use`)
				process.exit(1)
				break
			/* istanbul ignore next */
			default:
				throw error
		}
	}
	const onListening = () => {
		const addr = server.address()
		options.log.info('Listening on port ' + addr.port)
	}
	// Listen method
	const listen = () => {
		return new Promise((resolve) => {
			server.listen(options.http.port)
			server.on('error', (error) => {
				onError(error)
				resolve()
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
	app.use(morgan(options.http.logLevel, { stream }))
	// Return app & server
	return { app, server, listen }
}
