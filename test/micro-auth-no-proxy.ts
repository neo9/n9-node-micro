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

const MICRO_AUTH = join(__dirname, 'fixtures/micro-auth-no-proxy/')

test('Call session routes (JWT)', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		hasProxy: false, // tell n9Micro to parse `Authorization` header
		path: MICRO_AUTH,
		http: { port: 6001 },
	})
	/*
	** Fails with `session` empty
	*/
	let err = await t.throws(rp({
		method: 'POST',
		uri: 'http://localhost:6001/session-fail',
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 400)
	t.is(err.response.body.code, 'session-is-empty')
	/*
	** Fails with no `session.userId`
	*/
	err = await t.throws(rp({
		method: 'PUT',
		uri: 'http://localhost:6001/session',
		resolveWithFullResponse: true,
		body: {
			noUserId: true
		},
		json: true
	}))
	t.is(err.statusCode, 400)
	t.is(err.response.body.code, 'session-has-no-userId')
	/*
	** Get token
	*/
	const session = { userId: 1, name: 'Bruce Wayne' }
	let token
	let res = await rp({
		method: 'POST',
		uri: 'http://localhost:6001/session',
		resolveWithFullResponse: true,
		body: session,
		json: true
	})
	t.is(res.statusCode, 200)
	t.true(res.body.token.length > 100)
	token = res.body.token
	/*
	** Fails with bad `Authorization` header
	*/
	err = await t.throws(rp({
		method: 'GET',
		uri: 'http://localhost:6001/me',
		headers: {
			Authorization: 'bad'
		},
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 401)
	t.is(err.response.body.code, 'credentials-bad-schema')
	/*
	** Fails with no `Authorization` header
	*/
	err = await t.throws(rp({
		method: 'GET',
		uri: 'http://localhost:6001/me',
		resolveWithFullResponse: true,
		json: true
	}))
	t.is(err.statusCode, 401)
	t.is(err.response.body.code, 'credentials-required')
	/*
	** Fails with `Authorization` bad token
	*/
	err = await t.throws(rp({
		method: 'GET',
		uri: 'http://localhost:6001/me',
		resolveWithFullResponse: true,
		headers: {
			Authorization: 'Bearer bad'
		},
		json: true
	}))
	t.is(err.statusCode, 401)
	t.is(err.response.body.code, 'invalid-token')
	/*
	** Good `Authorization` header
	*/
	res = await rp({
		method: 'GET',
		uri: 'http://localhost:6001/me',
		headers: {
			Authorization: `Bearer ${token}`
		},
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.is(res.body.userId, session.userId)
	t.is(res.body.name, session.name)
	t.is(typeof res.body.exp, 'number')
	t.is(typeof res.body.iat, 'number')
	/*
	** Good `token` params (use getToken())
	*/
	res = await rp({
		method: 'GET',
		uri: `http://localhost:6001/me/${token}`,
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.is(res.body.userId, session.userId)
	t.is(res.body.name, session.name)
	t.is(typeof res.body.exp, 'number')
	t.is(typeof res.body.iat, 'number')
	/*
	** Good `token` params (type load & use getToken())
	*/
	res = await rp({
		method: 'GET',
		uri: `http://localhost:6001/me-load/${token}`,
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.is(res.body.userId, session.userId)
	t.is(res.body.name, session.name)
	t.is(typeof res.body.exp, 'number')
	t.is(typeof res.body.iat, 'number')
	/*
	** Good `token` params (type load & use getToken())
	*/
	res = await rp({
		method: 'GET',
		uri: `http://localhost:6001/me-load/Bearer%20${token}`,
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.is(res.body.userId, session.userId)
	t.is(res.body.name, session.name)
	t.is(typeof res.body.exp, 'number')
	t.is(typeof res.body.iat, 'number')
	/*
	** type: 'load' with getToken()
	*/
	res = await rp({
		method: 'GET',
		uri: 'http://localhost:6001/me-load/bad',
		resolveWithFullResponse: true,
		json: true
	})
	t.is(res.statusCode, 200)
	t.is(res.body.session, false)
	// Clear stdout
	stdMock.restore()
	stdMock.flush()
	// Close server
	await closeServer(server)
})
