export async function createFoo(req, res) {
	res.status(200)
	res.json(req.body)
}
