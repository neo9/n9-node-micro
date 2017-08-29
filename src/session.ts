import { N9Error } from '@neo9/n9-node-utils'

/*
** Parse `req.headers.session`
*/
async function loadSession(req): Promise<void> {
	if (!req.headers.session) {
		throw new N9Error('session-required', 401)
	}
	try {
		req.session = JSON.parse(req.headers.session)
	} catch (err) {
		throw new N9Error('session-header-is-invalid', 401)
	}
	if (!req.session.userId) {
		throw new N9Error('session-header-has-no-userId', 401)
	}
}

export default function(options, app) {
	// Add first middleware to add JWT support
	app.use((req, res, next) => {
		req.loadSession = loadSession.bind(options, req)
		next()
	})
}
