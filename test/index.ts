import test from 'ava'
import n9Log from '@neo9/n9-node-log'
import * as stdMock from 'std-mocks'
import * as rp from 'request-promise-native'

import n9Micro from '../src'

const closeServer = (server) => {
	return new Promise((resolve) => {
		server.close(resolve)
	})
}

test('Works with custom port', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({ http: { port: 4002 } })
	stdMock.restore()
	const output = stdMock.flush()
	t.true(output.stdout[0].includes('Listening on port 4002'))
	// Close server
	await closeServer(server)
})

test('Works with preventListen = true', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({ http: { port: 4002, preventListen: true } })
	stdMock.restore()
	const output = stdMock.flush()
	t.is(output.stdout.length, 0)
	t.is(output.stderr.length, 0)
	const err = await t.throws(rp('http://localhost:4200'))
	t.is(err.name, 'RequestError')
})

test('Works with custom log and should add a namespace', async (t) => {
	const log = n9Log('custom')
	stdMock.use()
	const { app, server } = await n9Micro({ log })
	stdMock.restore()
	const output = stdMock.flush()
	t.true(output.stdout[0].includes('[custom:n9-node-micro] Listening on port 5000'))
	// Close server
	await closeServer(server)
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

test('Should not log the requests http.logLevel=false', async (t) => {
	stdMock.use()
	const { server } = await(n9Micro({
		http: { logLevel: false }
	}))
	await rp('http://localhost:5000/')
	await rp('http://localhost:5000/ping')
	await rp('http://localhost:5000/routes')
	stdMock.restore()
	const output = stdMock.flush()
	t.is(output.stdout.length, 1)
	// Close server
	await closeServer(server)
})

test('Should log the requests with custom level', async (t) => {
	stdMock.use()
	const { server } = await(n9Micro({
		http: { logLevel: ':status :url' }
	}))
	await rp('http://localhost:5000/')
	await rp('http://localhost:5000/ping')
	await rp('http://localhost:5000/routes')
	stdMock.restore()
	const output = stdMock.flush()
	t.is(output.stdout.length, 4)
	t.true(output.stdout[1].includes('200 /'))
	t.true(output.stdout[2].includes('200 /ping'))
	t.true(output.stdout[3].includes('200 /routes'))
	// Close server
	await closeServer(server)
})

test('Fails with PORT without access', async (t) => {
	stdMock.use()
	const err = await t.throws(n9Micro({ http: { port: 80 } }))
	stdMock.restore()
	stdMock.flush()
	t.true(err.message.includes('Port 80 requires elevated privileges'))
})

test('Fails with PORT already used', async (t) => {
	stdMock.use()
	await n9Micro({ http: { port: 6000 } })
	const err = await t.throws(n9Micro({ http: { port: 6000 } }))
	stdMock.restore()
	const output = stdMock.flush()
	t.true(output.stdout[0].includes('Listening on port 6000'))
	t.true(err.message.includes('Port 6000 is already in use'))
})

test('Fails with PORT not in common range', async (t) => {
	stdMock.use()
	const err = await t.throws(n9Micro({ http: { port: 10000000 } }))
	t.true(err.message.includes('ort'))
	stdMock.restore()
	stdMock.flush()
})
