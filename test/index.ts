import test from 'ava'
import N9Log from 'n9-node-log'
import * as stdMock from 'std-mocks'
import * as rp from 'request-promise-native'
import { join } from 'path'

import n9Micro from '../src'

const pkg = require('../../package.json')

const closeServer = (server) => {
	return new Promise((resolve) => {
		server.close(resolve)
	})
}

test('Basic usage, create http server', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		path: join(__dirname, 'fixtures/micro-foo/')
	})
	// Check /foo route added on foo/foo.init.ts
	let res = await rp({ uri: 'http://localhost:5000/foo', resolveWithFullResponse: true, json: true })
	t.is(res.statusCode, 200)
	t.is(res.body.foo, 'bar')
	// Check / route
	res = await rp({ uri: 'http://localhost:5000/', resolveWithFullResponse: true })
	t.is(res.statusCode, 200)
	t.is(res.body, 'n9-node-micro')
	// Check /ping route
	res = await rp({ uri: 'http://localhost:5000/ping', resolveWithFullResponse: true })
	t.is(res.statusCode, 200)
	t.is(res.body, 'pong')
	// Check /404 route
	res = await t.throws(rp({ uri: 'http://localhost:5000/404', resolveWithFullResponse: true, json: true }))
	t.is(res.statusCode, 404)
	t.is(res.response.body.code, 'not-found')
	t.is(res.response.body.error.status, 404)
	t.is(res.response.body.error.context.url, '/404')
	// Check logs
	stdMock.restore()
	const output = stdMock.flush()
	// Logs on stdout
	t.true(output.stdout[0].includes('Init module bar'))
	t.true(output.stdout[1].includes('Init module foo'))
	t.true(output.stdout[2].includes('Hello foo.init'))
	t.true(output.stdout[3].includes('Adding bar routes'))
	t.true(output.stdout[4].includes('Adding foo routes'))
	t.true(output.stdout[5].includes('Listening on port 5000'))
	t.true(output.stdout[6].includes('GET /foo'))
	t.true(output.stdout[7].includes('GET /'))
	t.true(output.stdout[8].includes('GET /ping'))
	t.true(output.stdout[9].includes('GET /404'))
	// Logs on stderr
	t.true(output.stderr[0].includes('Route with index [2] must have a `path` defined'))
	t.true(output.stderr[1].includes('Route /foo must have a valid `method`'))
	t.true(output.stderr[2].includes('Route /foo must have a valid `method`'))
	t.true(output.stderr[3].includes('Route PUT - /foo must have a `handler` attached'))
	// Close server
	await closeServer(server)
})

test('Check /routes', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		path: join(__dirname, 'fixtures/micro-foo/'),
		http: { port: 5555 }
	})
	// Check /foo route added on foo/foo.init.ts
	const res = await rp({ uri: 'http://localhost:5555/routes', resolveWithFullResponse: true, json: true })
	t.is(res.statusCode, 200)
	t.is(res.body.length, 4)
	const route1 = res.body[0]
	t.is(route1.module, 'bar')
	t.is(route1.name, 'postBar') // if handler has no name, use method - module
	t.is(route1.description, '')
	t.is(route1.version, 'v1')
	t.is(route1.method, 'post')
	t.is(route1.path, '/v1/bar')
	t.is(route1.validate.body.properties.bar.type, 'boolean')
	const route2 = res.body[1]
	t.is(route2.module, 'bar')
	t.is(route2.name, 'postBar') // if handler has no name, use method - module
	t.is(route2.description, '')
	t.is(route2.version, 'v2')
	t.is(route2.method, 'post')
	t.is(route2.path, '/v2/bar')
	t.is(route2.validate.body.properties.bar.type, 'boolean')
	t.is(route2.validate.headers.type, 'object')
	t.is(route2.validate.query.type, 'object')
	t.is(route2.validate.params.type, 'object')
	const route3 = res.body[2]
	t.is(route3.module, 'foo')
	t.is(route3.name, 'createFoo')
	t.is(route3.description, 'Foo route')
	t.is(route3.version, '*')
	t.is(route3.path, '/foo')
	t.deepEqual(route3.validate, {})
	t.deepEqual(route3.response, { fake: true })
	const route4 = res.body[3]
	t.is(route4.module, 'foo')
	t.is(route4.name, 'createFoo')
	t.is(route4.description, '')
	t.is(route4.version, 'v1')
	t.is(route4.path, '/v1/fou')
	// Check logs
	stdMock.restore()
	const output = stdMock.flush()
	// Close server
	await closeServer(server)
})

test('Call routes (versionning)', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		path: join(__dirname, 'fixtures/micro-foo/'),
		http: { port: 5556 }
	})
	let res = await rp({
		method: 'POST',
		uri: 'http://localhost:5556/v1/bar',
		body: {},
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.is(res.body.bar, 'foo')
	// Call /v1/fou
	res = await rp({
		method: 'POST',
		uri: 'http://localhost:5556/v1/fou',
		body: { hi: 'hello' },
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.deepEqual(res.body, { hi: 'hello' })
	// Call special route which fails
	let err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:5556/v1/bar',
		qs: { error: true },
		body: {},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 500)
	t.is(err.response.body.code, 'bar-error')
	// Call special route which fails with extendable error
	err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:5556/v2/bar',
		qs: { error: true },
		body: {},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 505)
	t.is(err.response.body.code, 'bar-extendable-error')
	t.is(err.response.body.error.status, 505)
	t.deepEqual(err.response.body.error.context, { test: true })
	stdMock.restore()
	const output = stdMock.flush()
	t.true(output.stderr.join(' ').includes('Error: bar-extendable-error'))
	// Close server
	await closeServer(server)
})

test('Call routes (bad versions)', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		path: join(__dirname, 'fixtures/micro-foo/'),
		http: { port: 5557 }
	})
	// Call a version not specified explicitly
	const err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:5557/v3/bar',
		body: {},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 400)
	t.is(err.response.body.code, 'version-not-supported')
	t.is(err.response.body.error.status, 400)
	t.deepEqual(err.response.body.error.context.version, ['v1', 'v2'])
	// Call a route with version not specified
	const res = await rp({
		method: 'POST',
		uri: 'http://localhost:5557/v10/foo',
		body: { james: 'bond' },
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.is(res.body.james, 'bond')
	stdMock.restore()
	const output = stdMock.flush()
	// Close server
	await closeServer(server)
})

test('Call routes with error in production (no leak)', async (t) => {
	process.env.NODE_ENV = 'production'
	stdMock.use()
	const { app, server } = await n9Micro({
		path: join(__dirname, 'fixtures/micro-foo/'),
		http: { port: 5587 }
	})
	// Call special route which fails
	let err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:5587/v1/bar',
		qs: { error: true },
		body: {},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 500)
	t.is(err.response.body.code, 'bar-error')
	t.deepEqual(err.response.body.error, {})
	// Call special route which fails with extendable error
	err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:5587/v2/bar',
		qs: { error: true },
		body: {},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 505)
	t.is(err.response.body.code, 'bar-extendable-error')
	t.deepEqual(err.response.body.error, {})
	stdMock.restore()
	const output = stdMock.flush()
	t.true(output.stderr.join(' ').includes('Error: bar-extendable-error'))
	// Close server
	await closeServer(server)
	delete process.env.NODE_ENV
})

test('Works with custom port', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({ http: { port: 4000 }})
	stdMock.restore()
	const output = stdMock.flush()
	t.true(output.stdout[0].includes('Listening on port 4000'))
	// Close server
	await closeServer(server)
})

test('Works with custom log and should add a namespace', async (t) => {
	const log = new N9Log('custom')
	stdMock.use()
	const { app, server } = await n9Micro({ log })
	stdMock.restore()
	const output = stdMock.flush()
	t.true(output.stdout[0].includes('[custom:n9-node-micro] Listening on port 5000'))
	// Close server
	server.close()
})

test('Works without params', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro()
	stdMock.restore()
	const output = stdMock.flush()
	t.true(output.stdout[0].includes('[n9-node-micro] Listening on port 5000'))
	// Close server
	await closeServer(server)
})

test('Fails with PORT without access', async (t) => {
	stdMock.use()
	let exitCode = 0
	const processExit = new Promise((resolve) => {
		const oldExit = process.exit
		process.exit = (code) => {
			process.exit = oldExit
			exitCode = code
			resolve()
		}
	})
	await n9Micro({ http: { port: 80 }})
	await processExit
	stdMock.restore()
	const output = stdMock.flush()
	t.is(exitCode, 1)
	t.true(output.stderr.join(' ').includes('Port 80 requires elevated privileges'))
})

test('Fails with PORT already used', async (t) => {
	stdMock.use()
	let exitCode = 0
	const processExit = new Promise((resolve) => {
		const oldExit = process.exit
		process.exit = (code) => {
			process.exit = oldExit
			exitCode = code
			resolve()
		}
	})
	await n9Micro({ http: { port: 6000 }})
	await n9Micro({ http: { port: 6000 }})
	await processExit
	stdMock.restore()
	const output = stdMock.flush()
	t.is(exitCode, 1)
	t.true(output.stdout[0].includes('Listening on port 6000'))
	t.true(output.stderr.join(' ').includes('Port 6000 is already in use'))
})

test('Fails with PORT not in common range', async (t) => {
	const err = await t.throws(n9Micro({ http: { port: 10000000 }}))
	t.true(err.message.includes('port'))
})
