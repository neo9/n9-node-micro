import { createServer } from 'http'

import * as express from 'express'
import * as morgan from 'morgan'
import * as helmet from 'helmet'
import * as bodyParser from 'body-parser'
import stringify from 'fast-safe-stringify'

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

	morgan.token('total-response-time', (req: any) => {
		if (!(req)._startAt) {
			return
		}

		const reqStartTime = (req)._startAt
		const resEndTime = process.hrtime()
		const ms = (resEndTime[0] - reqStartTime[0]) * 1e3 + (resEndTime[1] - reqStartTime[1]) * 1e-6

		return ms.toFixed(3)
	})

	options.http.logLevel = (typeof options.http.logLevel !== 'undefined' ? options.http.logLevel : (tokens, req, res) => {
		const formatLogInJSON = global.log.options.formatJSON

		if (formatLogInJSON) {
			return JSON.stringify({
					'method': tokens.method(req, res),
					'request-id': options.enableRequestId ? `(${req.headers['x-request-id']})` : '',
					'path': tokens.url(req, res),
					'status': tokens.status(req, res),
					'durationMs': Number.parseFloat(tokens['response-time'](req, res)),
					'totalDurationMs': Number.parseFloat(tokens['total-response-time'](req, res)),
					'content-length': tokens.res(req, res, 'content-length')
			})
		} else {
			return [
					tokens.method(req, res),
					tokens.url(req, res),
					tokens.status(req, res),
					tokens['response-time'](req, res), 'ms - ',
					tokens.res(req, res, 'content-length')
			].join(' ')
		}
	}) as any

	// Middleware
	app.use(helmet())
	options.http.bodyParser = options.http.bodyParser || {}
	app.use(bodyParser.urlencoded(Object.assign({ extended: false }, options.http.bodyParser.urlencoded)))
	app.use(bodyParser.json(options.http.bodyParser.json))

	// Logger middleware
	if (options.http.logLevel) {
		app.use(morgan(options.http.logLevel as any, {
			stream: {
					write: (message) => {
							if (global.log && global.log.options && global.log.options.formatJSON) {
									try {
											const morganDetails = JSON.parse(message)
											options.log.info('api call ' + morganDetails.path, morganDetails)
									} catch (e) {
											message = message && message.replace('\n', '')
											options.log.info(message, { errString: stringify(e) })
									}
							} else {
									message = message && message.replace('\n', '')
									options.log.info(message)
							}
					}
			}})
		)
	}

	// Return app & server
	return { app, server, listen }
}
