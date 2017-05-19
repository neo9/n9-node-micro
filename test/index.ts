import test from 'ava'
import n9Log from 'n9-node-log'
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
	let exitCode = 0
	const processExit = new Promise((resolve) => {
		const oldExit = process.exit
		process.exit = (code) => {
			process.exit = oldExit
			exitCode = code
			resolve()
		}
	})
	await n9Micro({ http: { port: 80 } })
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
	await n9Micro({ http: { port: 6000 } })
	await n9Micro({ http: { port: 6000 } })
	await processExit
	stdMock.restore()
	const output = stdMock.flush()
	t.is(exitCode, 1)
	t.true(output.stdout[0].includes('Listening on port 6000'))
	t.true(output.stderr.join(' ').includes('Port 6000 is already in use'))
})

test('Fails with PORT not in common range', async (t) => {
	stdMock.use()
	const err = await t.throws(n9Micro({ http: { port: 10000000 } }))
	t.true(err.message.includes('port'))
	stdMock.restore()
	stdMock.flush()
})
