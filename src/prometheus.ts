import { createMiddleware } from '@promster/express'
import { Request, Response } from 'express'

import * as PromsterServer from '@promster/server'

export default async function(options, app) {

	app.use(createMiddleware({
		options: {
			normalizePath: (path: string, rr: { req: Request, res: Response }): string => rr.req.route ? rr.req.route.path : path,
			labels: options.prometheus.labels,
			getLabelValues: options.prometheus.getLabelValues,
			accuracies: options.prometheus.accuracies,
			skip: options.prometheus.skip
		}
	}))

	await PromsterServer.createServer({ port: options.prometheus.port })
	options.log.info(`@promster/server started on port ${options.prometheus.port}`)
}
