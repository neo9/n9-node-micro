export default async function({ log, app, server }) {
	log.info('Hello foo.init')
	app.get('/foo', (req, res) => {
		res.status(200)
		res.json({ foo: 'bar' })
	})
}
