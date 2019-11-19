import { getSomethingByCode, voidRoute } from './prometheus.controller'

export default [
	{
		method: 'GET',
		path: '/by-code/:code',
		handler: getSomethingByCode,
	},
	{
		method: 'GET',
		path: '/sample-route',
		handler: voidRoute
	}
]
