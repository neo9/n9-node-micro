import test from 'ava'
import n9Log from '@neo9/n9-node-log'
import * as stdMock from 'std-mocks'
import * as rp from 'request-promise-native'
import { join } from 'path'

import n9Micro from '../src'

const closeServer = (server) => {
	return new Promise((resolve) => {
		server.close(resolve)
	})
}

const MICRO_FOO = join(__dirname, 'fixtures/micro-foo/')

test('Basic usage, create http server', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		path: MICRO_FOO, enableLogFormatJSON: false
	})
	// Check /foo route added on foo/foo.init.ts
	let res = await rp({ uri: 'http://localhost:5000/foo', resolveWithFullResponse: true, json: true })
	t.is(res.statusCode, 200)
	t.is(res.body.foo, 'bar')
	// Check / route
	res = await rp({ uri: 'http://localhost:5000/', resolveWithFullResponse: true })
	t.is(res.statusCode, 200)
	t.is(res.body, '@neo9/n9-node-micro')
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
	t.true(output.stdout[9].includes('Error: not-found'))
	t.true(output.stdout[10].includes('GET /404'))
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
		path: MICRO_FOO,
		http: { port: 5575 }
	})
	// Check /foo route added on foo/foo.init.ts
	const res = await rp({ uri: 'http://localhost:5575/routes', resolveWithFullResponse: true, json: true })
	t.is(res.statusCode, 200)
	t.is(res.body.length, 5)
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
	t.is(route3.module, 'bar')
	t.is(route3.name, 'handler') // if handler has no name, use method - module
	t.is(route3.description, '')
	t.is(route3.version, '*')
	t.is(route3.method, 'get')
	t.is(route3.path, '/bar-fail')
	t.deepEqual(route3.validate, {})
	const route4 = res.body[3]
	t.is(route4.module, 'foo')
	t.is(route4.name, 'createFoo')
	t.is(route4.description, 'Foo route')
	t.is(route4.version, '*')
	t.is(route4.path, '/foo')
	t.deepEqual(route4.validate, {})
	t.deepEqual(route4.response, { fake: true })
	const route5 = res.body[4]
	t.is(route5.module, 'foo')
	t.is(route5.name, 'createFoo')
	t.is(route5.description, '')
	t.is(route5.version, 'v1')
	t.is(route5.path, '/v1/fou')
	// Check logs
	stdMock.restore()
	const output = stdMock.flush()
	// Close server
	await closeServer(server)
})

test('Call routes (versionning)', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		path: MICRO_FOO,
		http: { port: 5559 }
	})
	let res = await rp({
		method: 'POST',
		uri: 'http://localhost:5559/v1/bar',
		body: {},
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.is(res.body.bar, 'foo')
	// Call /v1/fou
	res = await rp({
		method: 'POST',
		uri: 'http://localhost:5559/v1/fou',
		body: { hi: 'hello' },
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.deepEqual(res.body, { hi: 'hello' })
	// Call special route which fails
	let err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:5559/v1/bar',
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
		uri: 'http://localhost:5559/v2/bar',
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
		path: MICRO_FOO,
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
	t.is(err.statusCode, 404)
	t.is(err.response.body.code, 'not-found')
	t.is(err.response.body.error.status, 404)
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

test('Call routes with error in development (error key)', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		path: MICRO_FOO,
		http: { port: 5587 }
	})
	// Call error with no message
	const err = await t.throws(rp({
		method: 'GET',
		uri: 'http://localhost:5587/bar-fail',
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 500)
	t.deepEqual(err.response.body, {
		code: 'unspecified-error',
		status: 500,
		context: {},
		error: {}
	})
	stdMock.restore()
	stdMock.flush()
	// Close server
	await closeServer(server)
})

test('Call routes with error in production (no leak)', async (t) => {
	process.env.NODE_ENV = 'production'
	stdMock.use()
	const { app, server } = await n9Micro({
		path: MICRO_FOO,
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
	t.deepEqual(err.response.body, {
		code: 'bar-error',
		status: 500,
		context: {},
		// no error key
	})
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
	t.deepEqual(err.response.body, {
		code: 'bar-extendable-error',
		status: 505,
		context: {
			test: true
		},
		// no error key
	})
	// Should send back 404
	err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:5587/no-version/bar',
		qs: { error: true },
		body: {},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 404)
	// Call 404
	err = await t.throws(rp({
		method: 'GET',
		uri: 'http://localhost:5587/404',
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 404)
	t.deepEqual(err.response.body, {
		code: 'not-found',
		status: 404,
		context: {
			url: '/404'
		},
		// no error key
	})
	// Call error with no message
	err = await t.throws(rp({
		method: 'GET',
		uri: 'http://localhost:5587/bar-fail',
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 500)
	t.deepEqual(err.response.body, {
		code: 'unspecified-error',
		status: 500,
		context: {},
		// no error key
	})
	stdMock.restore()
	const output = stdMock.flush()
	t.true(output.stderr.join(' ').includes('Error: bar-extendable-error'))
	// Close server
	await closeServer(server)
	delete process.env.NODE_ENV
})
