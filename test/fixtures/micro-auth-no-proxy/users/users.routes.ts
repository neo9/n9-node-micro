import { jwt } from '../../../../src/'

export default [
	{
		method: 'post',
		path: '/session-fail',
		async handler(req, res) {
			res.json({
				token: await req.generateJWT()
			})
		}
	},
	{
		method: ['POST', 'put'],
		path: '/session',
		async handler(req, res) {
			res.json({
				token: await jwt.generateJWT(req.body)
			})
		}
	},
	{
		method: 'get',
		path: '/me',
		session: true,
		handler(req, res) {
			res.json(req.session)
		}
	},
	{
		method: 'get',
		path: '/me/:token',
		session: {
			getToken: (req) => req.params.token
		},
		handler(req, res) {
			res.json(req.session)
		}
	},
	{
		method: 'get',
		path: '/me-load/:token',
		session: {
			type: 'load',
			getToken: (req) => req.params.token
		},
		handler(req, res) {
			res.json(req.session || { session: false })
		}
	}
]
