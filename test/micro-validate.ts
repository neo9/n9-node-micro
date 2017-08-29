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

const MICRO_VALIDATE = join(__dirname, 'fixtures/micro-validate/')

test('Check allowUnkown', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		path: MICRO_VALIDATE,
		http: { port: 5585 }
	})
	// Should not allow others keys
	const err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:5585/validate',
		resolveWithFullResponse: true,
		body: {
			bad: true,
			username: 'ok'
		},
		json: true
	}))
	t.is(err.statusCode, 400)
	t.true(err.response.body.error.errors[0].messages.join(' ').includes('is not allowed'))
	// Should allow others keys
	let res = await rp({
		method: 'POST',
		uri: 'http://localhost:5585/validate',
		resolveWithFullResponse: true,
		body: {
			username: 'ok'
		},
		json: true
	})
	t.is(res.statusCode, 200)
	t.true(res.body.ok)
	// Should allow others keys
	res = await rp({
		method: 'POST',
		uri: 'http://localhost:5585/validate-ok',
		resolveWithFullResponse: true,
		body: {
			bad: true,
			username: 'ok'
		},
		json: true
	})
	t.is(res.statusCode, 200)
	t.true(res.body.ok)
	// Check logs
	stdMock.restore()
	const output = stdMock.flush()
	// Close server
	await closeServer(server)
})
