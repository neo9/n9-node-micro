export default [
	{
		method: ['POST', 'put'],
		path: '/users',
		auth: true,
		handler(req, res) {
			res.json(req.session)
		}
	}
]
