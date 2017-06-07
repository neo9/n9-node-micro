# n9-node-micro

Neo9 microservice module: init every module, create the express server, add the required routes (/, /ping & /routes) & module routes.

## Installation

```bash
npm install --save n9-node-micro
```

## Usage

`n9Micro([options])`

Options:

- path: `String`, default: `'./modules/'`
- log: `Function`, default: `global.log`, need to be a [N9Log](http://scm.bytefactory.fr/projects/N9NODE/repos/n9-node-log/browse) instance. If no one is found, will use `n9Log('n9-node-micro')`
- http: `Object`, default: `{}`
	- logLevel: `String` | `false`, default: `'dev'`, see [available levels](https://github.com/expressjs/morgan#predefined-formats)
	- port: `Number`, default: `5000`


## Example

```bash
modules/
  users/
    users.init.ts
    users.routes.ts
server.ts
```

`server.ts`

```ts
import N9Log from 'n9-node-log'
import n9Micro from 'n9-node-micro'

(async () => {
  await n9Micro({ log: n9Log('my-app') })
})()
```

## Modules init

Every module can have a `*.init.(ts|js)` file wich exports a method. This method can be asynchronous (using `async` or returning a `Promise`), it reveices an object as argument with `log`, `app` and `server`.

Example:

`modules/io/io.init.ts`

export default
```ts
import * as socketIO from 'socket.io'

export default async function({ log, server }) {
  log.info('Creating socket server')
  global.io = socketIO(server)
}
```

## Routes

Routes format (`*.routes.ts`) should export an `Array` of `Object` with at least these properties:

- method: `String` or `[String]`
- path: `String`
- handler: `Function` or `[Function]`

Optional properties:

- version: `String` or `[String]`, default: `'*'`
- name: `String`, default: `handler.name`, for [n9-node-connector](http://scm.bytefactory.fr/projects/N9NODE/repos/n9-node-connector/browse)
- validate: `Object`, default: `{}`
	- headers: [Joi Schema](https://github.com/hapijs/joi)
	- params: [Joi Schema](https://github.com/hapijs/joi)
	- query: [Joi Schema](https://github.com/hapijs/joi)
	- body: [Joi Schema](https://github.com/hapijs/joi)
- auth: `Boolean`, default: `false`, if true, will require `req.headers.user` to exists, parse it and set it to `req.user`
- acl: `Array`, default: `[]`, list of permissions to access this route, if defined, `auth` will be set to `true`
- documentation: `Object`, default: `{}`
	- description: `String`
	- response: `Object`, example of response sent back

Example :

`modules/foo/foo.routes.js`

```ts
import * as Joi from 'joi'

export default [
  {
    version: 'v1',
    method: 'post',
    path: '/foo',
    validate: {
      body: Joi.object().keys({
        foo: Joi.boolean()
      })
    },
    documentation: {
      description: 'Foo route',
      response: { ok: true }
    },
    handler: (req, res) => {
      res.json({ ok: true })
    }
  }
]
```

`server.ts`

```ts
import n9Micro from './src'

(async () => {
  await n9Micro()
})()
```

If we go to [http://localhost:5000/routes](http://localhost:5000/routes), we will have:

```json
[
  {
    module: "foo",
    name: "handler",
    description: "Foo route",
    version: "v1",
    method: "post",
    path: "/v1/foo",
    auth: false,
    acl: [ ],
    validate: {
      body: {
        type: "object",
        properties: {
          foo: {
            type: "boolean"
          }
        },
        additionalProperties: false,
        patterns: [ ]
      }
    },
    response: {
      ok: true
    }
  }
]
```

## Application routes

### GET - /

Send back the application name (from `package.json`).

### GET - /ping

Send back status code 200 with text `pong`.

### GET - /routes

Send back the list of routes available for the microservice.
