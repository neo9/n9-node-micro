import { createFoo } from './foo.controller'

export default [
	{
		method: 'post',
		path: '/foo',
		handler: createFoo,
		documentation: {
			description: 'Foo route',
			response: { fake: true }
		}
	},
	{
		version: 'v1',
		method: 'post',
		path: '/fou',
		handler: createFoo
	},
	{
		method: 'post'
		// Should log error because no path defined
	},
	{
		// Should log error because not method defined
		path: '/foo'
	},
	{
		method: 'bad', // Should log error because bad method
		path: '/foo'
	},
	{
		method: 'put',
		path: '/foo'
		// Should log error because bad handler defined
	}
]
