import { existsSync } from 'fs'
import { join } from 'path'
import N9Log from 'n9-node-log'
import * as appRootDir from 'app-root-dir'

import httpServer from './http'
import initModules from './init'

import { N9MicroOptions } from './index.d'

export default async function(options?: N9MicroOptions) {
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
}
