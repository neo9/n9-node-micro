import * as Joi from 'joi'

export default [
	{
		method: 'post',
		path: '/validate',
		validate: {
			body: Joi.object().keys({
				username: Joi.string().min(2).required()
			})
		},
		handler(req, res) {
			res.json({ ok: true })
		}
	},
	{
		method: 'post',
		path: '/validate-ok',
		validate: {
			options: {
				allowUnknownBody: true
			},
			body: Joi.object().keys({
				username: Joi.string().min(2).required()
			})
		},
		handler(req, res) {
			res.json({ ok: true })
		}
	}
]
