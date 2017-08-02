import * as jwt from 'jsonwebtoken'
import { cb, N9Error } from 'n9-node-utils'

async function generateJWT(req, session: any): Promise<string> {
	if (!session) {
		throw new N9Error('session-is-empty', 400)
	}
	if (!session.userId) {
		throw new N9Error('session-has-no-userId', 400)
	}
	return await cb(jwt.sign, session, this.jwt.secret, { expiresIn: this.jwt.expiresIn })
}

/*
** Load the session into req.session
*/
async function loadSession(req, getToken?: (req) => string): Promise<void> {
	const headerKey = this.jwt.headerKey.toLowerCase()
	// Get token
	let token
	if (typeof getToken === 'function') {
		token = getToken(req)
	} else if (req.headers && req.headers[headerKey]) {
		const parts = req.headers[headerKey].split(' ')
		if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
			token = parts[1]
		} else {
			throw new N9Error('credentials-bad-schema', 401, { message: `Format is ${headerKey}: Bearer [token]` })
		}
	}
	token = sanitizeToken(token)
	// if no token, answer directly
	if (!token) {
		throw new N9Error('credentials-required', 401)
	}
	// Verify token
	let session
	try {
		session = await cb(jwt.verify, token, this.jwt.secret)
	} catch (err) {
		throw new N9Error('invalid-token', 401)
	}
	// Verify session.userId
	/* istanbul ignore if */
	if (!session.userId) {
		throw new N9Error('session-has-no-userId', 401)
	}
	req.session = session
}

function sanitizeToken(token: string) {
	token = token || ''
	if (token.split(' ')[0].toLowerCase() === 'bearer') {
		token = token.split(' ')[1]
	}
	return token
}

export default function(options, app) {
	// Add first middleware to add JWT support
	app.use((req, res, next) => {
		req.generateJWT = generateJWT.bind(options, req)
		req.loadSession = loadSession.bind(options, req)
		next()
	})
}
