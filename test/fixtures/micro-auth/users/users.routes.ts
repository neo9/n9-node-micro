export default [
	{
		method: 'POST',
		path: '/users',
		auth: true,
		handler(req, res) {
			res.json(req.user)
		}
	}
]
