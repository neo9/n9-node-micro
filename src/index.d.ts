import { Server } from 'http'
import { Express } from 'express'
import N9Log from 'n9-node-log'

export module N9Micro {

	interface Options {
		path?: string
		log?: N9Log
		http?: {
			logLevel?: 'dev',
			port?: number
		}
	}

	interface HttpContext {
		app: Express,
		server: Server
	}

}
