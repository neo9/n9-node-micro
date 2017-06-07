import test from 'ava'
import n9Log from 'n9-node-log'
import * as stdMock from 'std-mocks'
import * as rp from 'request-promise-native'
import { join } from 'path'

import n9Micro from '../src'

const closeServer = (server) => {
	return new Promise((resolve) => {
		server.close(resolve)
	})
}

const MICRO_AUTH = join(__dirname, 'fixtures/micro-auth/')

test('Call route with auth=true', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		path: MICRO_AUTH,
		http: { port: 6001 }
	})
	/*
	** Fails with no `session` header
	*/
	let err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:6001/users',
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 401)
	t.is(err.response.body.code, 'session-required')
	/*
	** Fails with bad `session` header
	*/
	err = await t.throws(rp({
		method: 'PUT',
		uri: 'http://localhost:6001/users',
		headers: {
			session: 'bad'
		},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 400)
	t.is(err.response.body.code, 'session-header-is-invalid')
	/*
	** Good `session` header
	*/
	const session = { id: 1, name: 'Bruce Wayne' }
	const res = await rp({
		method: 'POST',
		uri: 'http://localhost:6001/users',
		headers: {
			session: JSON.stringify(session)
		},
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.deepEqual(res.body, session)
	// Clear stdout
	stdMock.restore()
	stdMock.flush()
	// Close server
	await closeServer(server)
})
