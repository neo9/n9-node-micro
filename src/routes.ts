import { join } from 'path'

import * as validate from 'express-validation'
import * as joiToJson from 'joi-to-json-schema'
import * as glob from 'glob-promise'
import * as appRootDir from 'app-root-dir'
import { Router, Express } from 'express'
import { N9Error } from 'n9-node-utils'

import { N9Micro } from './index'

const METHODS = ['get', 'post', 'put', 'delete', 'head', 'patch', 'all']

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
			if (!r.method || METHODS.indexOf(String(r.method).toLowerCase()) === -1) {
				log.error(`Module [${moduleName}]: Route ${r.path} must have a valid \`method\` (${METHODS.join(', ')})`)
				return false
			}
			if (!r.handler) {
				log.error(`Module [${moduleName}]: Route ${r.method.toUpperCase()} - ${r.path} must have a \`handler\` attached`)
				return false
			}
			// Make sure r.handler is an array
			r.handler = (!Array.isArray(r.handler)) ? [ r.handler ] : r.handler
			// Add validation middleware validate schema defined (3rd)
			if (r.validate) {
				r.handler.unshift(validate(r.validate))
			}
			// Handle auth (2nd)
			if (r.auth) {
				r.handler.unshift(auth)
			}
			// Handle versionning (1st)
			r.handler.unshift(versionning(r.version))
			// Add route in express app, see http://expressjs.com/fr/4x/api.html#router.route
			r.method = String(r.method).toLowerCase()
			moduleRouter.route(`/:version?${r.path}`)[r.method](r.handler)
			return true
		})
		// Add module routes to the app
		app.use(moduleRouter)
		// Add routes definitions to /routes
		routes = routes.concat(...moduleRoutes.map((r) => {
			// Force version to be an array
			const versions = (!Array.isArray(r.version) ? [ r.version || '*' ] : r.version)
			// Force documentation key to be defined
			r.documentation = r.documentation || {}
			// Return a route definition for each version
			return versions.map((version) => {
				const module = routeFile.split('/')[0]
				return {
					module,
					name: (r.name || r.handler[r.handler.length - 1].name || `${r.method}${module[0].toUpperCase()}${module.slice(1)}`),
					description: r.documentation.description || '',
					version,
					method: r.method,
					path: (version !== '*' ? `/${version}${r.path}` : r.path),
					auth: r.auth || false,
					acl: r.acl || [],
					validate: {
						headers: r.validate && r.validate.headers ? joiToJson(r.validate.headers) : undefined,
						params: r.validate && r.validate.params ? joiToJson(r.validate.params) : undefined,
						query: r.validate && r.validate.query ? joiToJson(r.validate.query) : undefined,
						body: r.validate && r.validate.body ? joiToJson(r.validate.body) : undefined
					},
					response: r.documentation.response
				}
			})
		}))
	})
	// Handle 404 errors
	app.use((req, res, next) => {
		return next(new N9Error('not-found', 404, { url: req.url }))
	})
	// Log error
	app.use((err, req, res, next) => {
		if (err.status && err.status >= 500) {
			log.error(err)
		}
		next(err)
	})
	// Development error handler will print stacktrace
	/* istanbul ignore else */
	if (app.get('env') === 'development') {
		app.use((err, req, res, next) => {
			res.status(err.status || 500)
			res.json({
				code: err.message,
				error: err
			})
		})
	}
	// Production error handler: no stacktraces leaked to user
	app.use((err, req, res, next) => {
		res.status(err.status || 500)
		res.json({
			code: err.message,
			error: {}
		})
	})
}

function versionning(version) {
	return (req, res, next) => {
		// If no version defined for the route, ignore actual version
		if (!version) {
			return next()
		}
		// Force version to be an array
		version = (!Array.isArray(version) ? [ version ] : version)
		// Check if param version is matching the route version(s)
		if (version.includes(req.params.version)) {
			return next()
		}
		next(new N9Error('version-not-supported', 400, { version }))
	}
}

function auth(req, res, next) {
	if (!req.headers.user) {
		return next(new N9Error('user-required', 401))
	}
	try {
		req.user = JSON.parse(req.headers.user)
	} catch (err) {
		return next(new N9Error('user-header-is-invalid', 400))
	}
	if (!req.user.id) {
		return next(new N9Error('user-header-has-no-id', 400))
	}
	next()
}
