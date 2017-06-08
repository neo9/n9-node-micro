import { existsSync } from 'fs'
import { join } from 'path'
import n9Log from 'n9-node-log'
import * as appRootDir from 'app-root-dir'

import httpServer from './http'
import initModules from './init'
import loadRoutes from './routes'
import jwtMiddleware from './jwt'
import sessionMiddleware from './session'

import { N9Log } from 'n9-node-log'
import { Server } from 'http'
import { Express } from 'express'

export namespace N9Micro {

	export interface HttpOptions {
		logLevel?: string | false
		port?: number
	}

	export interface JWTOptions {
		secret?: string
		expiresIn?: number | string
	}

	export interface Options {
		hasProxy?: boolean
		path?: string
		log?: N9Log
		http?: HttpOptions
		jwt?: JWTOptions
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
	options.hasProxy = (typeof options.hasProxy === 'boolean' ? options.hasProxy : true)
	options.jwt = options.jwt || {}
	options.jwt.secret = options.jwt.secret || 'secret'
	options.jwt.expiresIn = options.jwt.expiresIn || '7d'
	// If log if given, add a namespace
	if (options.log) options.log = options.log.module('n9-node-micro')
	else options.log = n9Log('n9-node-micro')
	// Create HTTP server
	const { app, server, listen } = await httpServer(options)
	if (options.hasProxy) {
		// Add req.headers.session middleware (add req.loadSession)
		sessionMiddleware(options, app)
	} else {
		// Add JWT middleware (add req.generateJWT & req.loadSession)
		jwtMiddleware(options, app)
	}
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
