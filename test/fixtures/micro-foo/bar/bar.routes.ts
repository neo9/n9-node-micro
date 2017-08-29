import * as Joi from 'joi'

import { N9Error } from '@neo9/n9-node-utils'

module.exports = [
	{
		method: 'POST',
		path: '/bar',
		version: ['v1', 'v2'],
		validate: {
			body: Joi.object().keys({
				bar: Joi.boolean().equal(true)
			}),
			cookies: Joi.object(),
			headers: Joi.object(),
			query: Joi.object(),
			params: Joi.object()
		},
		handler: [
			(req, res, next) => {
				if (req.query.error) {
					if (req.params.version === 'v1')
						return next(new Error('bar-error'))
					return next(new N9Error('bar-extendable-error', 505, { test: true }))
				}
				res.json({ bar: 'foo' })
			}
		]
	},
	{
		method: 'GET',
		path: '/bar-fail',
		handler(req, res) {
			throw new Error()
		}
	}
]
