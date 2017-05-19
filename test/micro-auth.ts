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
	** Fails with no `user` header
	*/
	let err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:6001/users',
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 401)
	t.is(err.response.body.code, 'user-required')
	/*
	** Fails with bad `user` header
	*/
	err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:6001/users',
		headers: {
			user: 'bad'
		},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 400)
	t.is(err.response.body.code, 'user-header-is-invalid')
	/*
	** Fails with bad `user` header (no user.id)
	*/
	err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:6001/users',
		headers: {
			user: JSON.stringify({ noId: true })
		},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 400)
	t.is(err.response.body.code, 'user-header-has-no-id')
	/*
	** Good `user` header
	*/
	const user = { id: 1, name: 'Bruce Wayne' }
	const res = await rp({
		method: 'POST',
		uri: 'http://localhost:6001/users',
		headers: {
			user: JSON.stringify(user)
		},
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.deepEqual(res.body, user)
	// Clear stdout
	stdMock.restore()
	stdMock.flush()
	// Close server
	await closeServer(server)
})
