import { join } from 'path'

import * as validate from 'express-validation'
import * as joiToJson from 'joi-to-json-schema'
import * as glob from 'glob-promise'
import * as appRootDir from 'app-root-dir'
import { Router, Express } from 'express'
import { N9Error } from '@neo9/n9-node-utils'

import { N9Micro } from './index'

const METHODS = ['get', 'post', 'put', 'delete', 'head', 'patch', 'all']

// Force allowUnkown as false
validate.options({
	allowUnknownHeaders: true,
	allowUnknownBody: false,
	allowUnknownQuery: false,
	allowUnknownParams: true,
	allowUnknownCookies: true
})

export default async function({ path, log }: N9Micro.Options, app: Express) {
	// Fetch application name
	const name = require(join(appRootDir.get(), 'package.json')).name
	// Create the routes list
	let routes = []
	// Send back its name for discovery
	app.get('/', (req, res) => {
		res.status(200).send(name)
	})
	// Monitoring route
	app.get('/ping', (req, res) => {
		res.status(200).send('pong')
	})
	// List all routes
	app.get('/routes', (req, res) => {
		res.status(200).send(routes)
	})
	// Find every module which export .routes.ts file
	const routeFiles = await glob('**/*.routes.+(ts|js)', { cwd: path })
	// Add routes for every module
	routeFiles.forEach((routeFile) => {
		const moduleName = routeFile.split('/').slice(-2)[0]
		log.info(`Adding ${moduleName} routes`)
		// Create Express Router
		const moduleRouter = Router()
		// Fetch exported routes by the module
		let moduleRoutes = require(join(path, routeFile))
		moduleRoutes = moduleRoutes.default ? moduleRoutes.default : moduleRoutes
		// Create route handle for the exported routes
		moduleRoutes = moduleRoutes.filter((r, index) => {
			// Validate required params
			if (!r.path) {
				log.error(`Module [${moduleName}]: Route with index [${index}] must have a \`path\` defined.`)
				return false
			}
			if (!r.method) {
				log.error(`Module [${moduleName}]: Route ${r.path} must have a valid \`method\` (${METHODS.join(', ')})`)
				return false
			}
			r.method = (!Array.isArray(r.method) ? [r.method] : r.method).map((method) => String(method).toLowerCase())
			let validMethod = true
			r.method.forEach((method) => {
				if (METHODS.indexOf(String(method).toLowerCase()) === -1)
					validMethod = false
			})
			if (!validMethod) {
				log.error(`Module [${moduleName}]: Route ${r.path} must have a valid \`method\` (${METHODS.join(', ')})`)
				return false
			}
			if (!r.handler) {
				log.error(`Module [${moduleName}]: Route ${r.method.join('/').toUpperCase()} - ${r.path} must have a \`handler\` attached`)
				return false
			}
			// Create real handler
			const handler = []
			// Make sure r.handler is an array
			r.handler = (!Array.isArray(r.handler) ? [r.handler] : r.handler)
			// Overwrite r.name before overwritting the handler
			r.name = r.name || r.handler[r.handler.length - 1].name
			// Make sure there is a try/catch for each controller to avoid crashing the server
			r.handler = r.handler.map((fn) => {
				return async (req, res, next) => {
					try {
						await fn(req, res, next)
					} catch (err) {
						next(err)
					}
				}
			})
			// Handle authentication (2nd)
			if (r.session) {
				handler.push(authentication(r.session))
			}
			// Add validation middleware validate schema defined (3rd)
			if (r.validate) {
				handler.push(validate(r.validate))
			}
			r.handler = [...handler, ...r.handler]
			// Add route in express app, see http://expressjs.com/fr/4x/api.html#router.route
			r.method.forEach((method) => {
				let v = Array.isArray(r.version) ? r.version.join('|') : (r.version || '*')
				let optional = ''
				// If no version defined or accept any version
				if (v === '*') {
					v = 'v\\d+'
					optional = '?'
				}
				moduleRouter.route(`/:version(${v})${optional}${r.path}`)[method](r.handler)
			})
			return true
		})
		// Add module routes to the app
		app.use(moduleRouter)
		// Add routes definitions to /routes
		routes = routes.concat(...moduleRoutes.map((r) => {
			// Force version to be an array
			const versions = (!Array.isArray(r.version) ? [r.version || '*'] : r.version)
			// Force documentation key to be defined
			r.documentation = r.documentation || {}
			// Return a route definition for each version
			return [].concat(...versions.map((version) => {
				return r.method.map((method) => {
					const module = routeFile.split('/')[0]
					return {
						module,
						name: r.name || `${r.method}${module[0].toUpperCase()}${module.slice(1)}`,
						description: r.documentation.description || '',
						version,
						method,
						path: (version !== '*' ? `/${version}${r.path}` : r.path),
						session: r.session || false,
						can: r.can || false, // Add acl can route info
						is: r.is || false, // Add acl is route info
						validate: {
							headers: r.validate && r.validate.headers ? joiToJson(r.validate.headers) : undefined,
							cookies: r.validate && r.validate.headers ? joiToJson(r.validate.cookies) : undefined,
							params: r.validate && r.validate.params ? joiToJson(r.validate.params) : undefined,
							query: r.validate && r.validate.query ? joiToJson(r.validate.query) : undefined,
							body: r.validate && r.validate.body ? joiToJson(r.validate.body) : undefined
						},
						response: r.documentation.response
					}
				})
			}))
		}))
	})
	// Handle 404 errors
	app.use((req, res, next) => {
		return next(new N9Error('not-found', 404, { url: req.url }))
	})
	// Development error handler will print stacktrace
	/* istanbul ignore else */
	if (app.get('env') === 'development') {
		app.use((err, req, res, next) => {
			const status = err.status || 500
			const code = err.message || 'unspecified-error'
			const context = err.context || {}
			if (status < 500) {
				log.warn(err)
			} else {
				log.error(err)
			}
			res.status(status)
			res.json({
				code,
				status,
				context,
				error: err
			})
		})
	}
	// Production error handler: no stacktraces leaked to user
	app.use((err, req, res, next) => {
		const status = err.status || 500
		const code = err.message || 'unspecified-error'
		const context = err.context || {}
		if (status >= 500) {
			log.error(err)
		}
		res.status(status)
		res.json({
			code,
			status,
			context
		})
	})
}

function authentication(options) {
	let getToken
	let type = 'require'
	if (typeof options === 'object') {
		if (['load', 'require'].indexOf(options.type) !== -1) {
			type = options.type
		}
		getToken = options.getToken
	}
	return async (req, res, next) => {
		try {
			await req.loadSession(getToken)
		} catch (err) {
			if (type === 'require') {
				return next(err)
			}
		}
		next()
	}
}
