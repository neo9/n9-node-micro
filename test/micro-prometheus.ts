import test from 'ava'
import { Server } from 'http'
import { join } from 'path'
import * as rp from 'request-promise-native'
import * as stdMock from 'std-mocks'
import n9Micro from '../src'

const closeServer = async (server: Server) => {
	return new Promise((resolve) => {
		server.close(resolve)
	})
}

const MICRO_FOO = join(__dirname, 'fixtures/micro-prometheus/')

test('Basic usage, create http server', async (t) => {
	stdMock.use()
	const { app, server } = await n9Micro({
		path: MICRO_FOO,
		http: { port: 5000 },
		prometheus: { port: 5001, accuracies: ['s'] }
	})
	let res = await rp({ uri: 'http://localhost:5000/sample-route', resolveWithFullResponse: true, json: true })
	t.is(res.statusCode, 204)
	t.is(res.body, undefined)

	res = await rp({ uri: 'http://localhost:5000/by-code/code1', resolveWithFullResponse: true, json: true })
	t.is(res.statusCode, 204)
	t.is(res.body, undefined)

	// Check /foo route added on foo/foo.init.ts
	const resProm = await rp({ uri: 'http://localhost:5001/' })

	t.true(resProm.includes('http_requests_total{method="get",path="/:version(v\\\\d+)?/sample-route",status_code="204"} 1') ||
	resProm.includes('http_requests_total{method="get",status_code="204",path="/:version(v\\\\d+)?/sample-route"} 1')
	, 'Prom exposition contains call to sample-route')

	t.true(resProm.includes('http_requests_total{method="get",path="/:version(v\\\\d+)?/by-code/:code",status_code="204"} 1') ||
	resProm.includes('http_requests_total{method="get",status_code="204",path="/:version(v\\\\d+)?/by-code/:code"} 1')
	, 'Prom exposition contains call with route pattern')

	// Check logs
	stdMock.restore()
	const output = stdMock.flush()
	t.true(output.stdout[0].includes('@promster/server started on port 5001'))
	// Close server
	await closeServer(server)
})
