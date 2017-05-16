import test from 'ava'
import * as debug from 'debug'
import * as stdMock from 'std-mocks'
import { join } from 'path'

import n9Conf from '../src'
const app = require('../../package.json')

test('Simple use case', (t) => {
	const conf = n9Conf({ path: join(__dirname, './fixtures/conf') })
	t.is(conf.env, 'development')
	t.is(conf.name, app.name)
	t.is(conf.version, app.version)
	t.is(conf.test, true)
})

test('Custom path with custom NODE_ENV', (t) => {
	// Set NODE_ENV to 'test'
	process.env.NODE_ENV = 'test'
	const conf = n9Conf({ path: join(__dirname, './fixtures/conf-2') })
	t.is(conf.env, 'test')
	t.deepEqual(conf.array, [1, 2, 3])
	t.deepEqual(conf.object, {
		key1: 'string',
		key2: 23
	})
	t.is(String(conf.regexp), '/test-2/')
	t.is(conf.other, 'yes')
	// Remove NODE_ENV
	delete process.env.NODE_ENV
})

test('Simple work with process.env.NODE_CONF_PATH', (t) => {
	process.env.NODE_CONF_PATH = join(__dirname, './fixtures/conf')
	const conf = n9Conf()
	t.is(conf.env, 'development')
	t.is(conf.name, app.name)
	t.is(conf.version, app.version)
	t.is(conf.test, true)
	delete process.env.NODE_CONF_PATH
})

test('Should throw and error with bad path', (t) => {
	const error = t.throws(() => {
		n9Conf()
	})
	t.true(error.message.includes('Could not load config file'))
})
