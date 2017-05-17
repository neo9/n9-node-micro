import { existsSync } from 'fs'
import { join } from 'path'
import N9Log from 'n9-node-log'
import * as appRootDir from 'app-root-dir'

import httpServer from './http'
import initModules from './init'
import loadRoutes from './routes'

import { Server } from 'http'
import { Express } from 'express'

export namespace N9Micro {

	export interface Options {
		path?: string
		log?: N9Log
		http?: {
			logLevel?: 'dev'
			port?: number
		}
	}

	export interface HttpContext {
		app: Express
		server: Server
		listen: () => Promise<{}>
	}

}

export default async function(options?: N9Micro.Options) {
	// Provides a stack trace for unhandled rejections instead of the default message string.
	process.on('unhandledRejection', handleThrow)
	// Options default
	options = options || {}
	options.path = options.path || join(appRootDir.get(), 'modules')
	options.log = options.log || global.log
	// If log if given, add a namespace
	if (options.log) options.log = options.log.module('n9-node-micro')
	else options.log = new N9Log('n9-node-micro')
	// Create HTTP server
	const { app, server, listen } = await httpServer(options)
	// Init every modules
	await initModules(options, { app, server })
	// Load routes
	await loadRoutes(options, app)
	// Make the server listen
	await listen()
	// Return app & server
	return { app, server }
}

/* istanbul ignore next */
function handleThrow(err) {
	throw err
}
