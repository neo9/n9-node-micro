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

const MICRO_AUTH = join(__dirname, 'fixtures/micro-auth-proxy/')

test('Call session route (req.headers.session)', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		hasProxy: true, // tell n9Micro to parse `session` header
		path: MICRO_AUTH,
		http: { port: 6001 }
	})
	/*
	** Fails with no `session` header
	*/
	let err = await t.throws(rp({
		method: 'GET',
		uri: 'http://localhost:6001/me',
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 401)
	t.is(err.response.body.code, 'session-required')
	/*
	** Fails with bad `session` header
	*/
	err = await t.throws(rp({
		method: 'GET',
		uri: 'http://localhost:6001/me',
		headers: {
			session: 'bad'
		},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 401)
	t.is(err.response.body.code, 'session-header-is-invalid')
	/*
	** Fails with bad `session` header (no `userId`)
	*/
	err = await t.throws(rp({
		method: 'GET',
		uri: 'http://localhost:6001/me',
		headers: {
			session: JSON.stringify({ noUserId: true })
		},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 401)
	t.is(err.response.body.code, 'session-header-has-no-userId')
	/*
	** Good `session` header
	*/
	const session = { userId: 1, name: 'Bruce Wayne' }
	let res = await rp({
		method: 'GET',
		uri: 'http://localhost:6001/me',
		headers: {
			session: JSON.stringify(session)
		},
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.deepEqual(res.body, session)
	/*
	** No `session` header but session: { type: 'load' }
	*/
	res = await rp({
		method: 'GET',
		uri: 'http://localhost:6001/me-load',
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.deepEqual(res.body, { session: false })
	/*
	** With `session` header and session: { type: 'load' }
	*/
	res = await rp({
		method: 'GET',
		uri: 'http://localhost:6001/me-load',
		resolveWithFullResponse: true,
		headers: {
			session: JSON.stringify(session)
		},
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
