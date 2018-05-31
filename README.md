# n9-node-micro

Node microservice module: init every module, create an express server, add the required routes (/, /ping & /routes) & module routes.

[![npm version](https://img.shields.io/npm/v/@neo9/n9-node-micro.svg)](https://www.npmjs.com/package/@neo9/n9-node-micro)
[![Travis](https://img.shields.io/travis/neo9/n9-node-micro/master.svg)](https://travis-ci.org/neo9/n9-node-micro)
[![Coverage](https://img.shields.io/codecov/c/github/neo9/n9-node-micro/master.svg)](https://codecov.io/gh/neo9/n9-node-micro)
[![license](https://img.shields.io/github/license/neo9/n9-node-micro.svg)](https://github.com/neo9/n9-node-micro/blob/master/LICENSE)

## Installation

```bash
npm install --save @neo9/n9-node-micro
```

## Usage

`n9Micro([options]): Promise<{ app, server }>`

Options:

- hasProxy: `Boolean`, default: `true`, define if the server should handle JWT (see Authentication section below)
- path: `String`, default: `'./modules/'`
- log: `Function`, default: `global.log`, need to be a [N9Log](http://scm.bytefactory.fr/projects/N9NODE/repos/n9-node-log/browse) instance. If no one is found, will use `n9Log('n9-node-micro')`
- http: `Object`, default: `{}`
	- logLevel: `String` | `false`, default: `'dev'`, see [available levels](https://github.com/expressjs/morgan#predefined-formats)
	- port: `Number`, default: `5000`
	- preventListen: `Boolean`, default: `false`
- jwt: `Object`, default: `{ secret: 'secret', expiredIn: '7d' }`, only when `hasProxy: false`
	- secret: `String`, default `'secret'`
	- expiredIn: `String`, default `'7d'`


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
import n9Log from '@neo9/n9-node-log'
import n9Micro from '@neo9/n9-node-micro'

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
	- options: See [Express Validation Options](https://github.com/AndrewKeig/express-validation#unknown-schema-fields---strict-checking), default:
		- allowUnknownHeaders: `true`,
		- allowUnknownCookies: `true`
		- allowUnknownBody: `false`,
		- allowUnknownQuery: `false`,
		- allowUnknownParams: `true`,
	- headers: [Joi Schema](https://github.com/hapijs/joi)
	- cookies: [Joi Schema](https://github.com/hapijs/joi)
	- params: [Joi Schema](https://github.com/hapijs/joi)
	- query: [Joi Schema](https://github.com/hapijs/joi)
	- body: [Joi Schema](https://github.com/hapijs/joi)
- session: `Boolean` or `Object`, default: `false`, see **Authentication** below for more informations.
- can: `Object`, check [imperium](https://github.com/mono-js/imperium) can middleware for usage
- is: `Array<string>` | `string`, check [imperium](https://github.com/mono-js/imperium) is middleware
- withAcl: `Boolean` default: `false`, ask for acl actions to be injected to the response object. Check [imperium](https://github.com/mono-js/imperium) for more information
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
import n9Micro from '@neo9/n9-node-micro'

(async () => {
  await n9Micro()
})()
```

If we go to [http://localhost:5000/routes](http://localhost:5000/routes), we will have:

```js
[
  {
    module: 'foo',
    name: 'handler',
    description: 'Foo route',
    version: 'v1',
    method: 'post',
    path: '/v1/foo',
    session: false,
    acl: [ ],
    validate: {
      body: {
        type: 'object',
        properties: {
          foo: {
            type: 'boolean'
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

## Authentication

This module supports 2 ways for authentication, behind a proxy (`n9-node-micro-proxy`) or alone, to choose which one you want to use, specify the `hasProxy` option for `n9Micro()`.

- `session` header: `hasProxy: true`
- JSON Web Token: `hasProxy: false`

By default, `hasProxy` is set to `true`, this means that `n9Micro` will load `req.session` from the session header.

When defining the routes in your `*.routes.ts` files, you can use the `session` key to define the behaviour of `n9Micro`.

- session: `Boolean` or `Object`, default: `false`
	- type: `String`, default: `'require'`, values: `'require'` or `'load'`
	- getToken: `Function`, default: `undefined`, called with `req` as argument and should returns the token to decode (only for `hasProxy: false`)

When `type` is `'load'`, n9Micro will try to load `req.session` but will not fail.

### Session Header

By default, `hasProxy` is `true`, this means that `n9Micro` will load `req.session` from `JSON.parse(req.headers.session)`.

`req.headers.session` should be a JSON string and has a `userId` property when parsed.

### JSON Web Token

**Only with `hasProxy: false`**

`n9Micro` supports JWT and will check the `Authorization` header to be a valid token.

> Think to give `jwt` option to `n9Micro()` to give the secret key to sign & decode

Example:
```ts
// modules/users/users.routes.ts
export default [
  {
    method: 'post',
    path: '/me',
    session: true,
    handler: function(req, res, next) {
      res.json(req.session)
    }
  }
]
```

Here `session: true`, will require `req.headers.authorization` to exists (will use `jwt` option given to `n9Micro()` to decode).

The module also add 2 useful methods for loading a session & generating a JWT into `req`:

- `req.generateJWT(session: Object): Promise<string>`

Generates and returns a JWT based on the `session`.

- `req.loadSession(getToken?: Function): Promise<void>`

Will load the session from `req` and add it to `req.session`.

`getToken` is optional, takes `req` as argument and should returns the JWT (example: `(req) => req.query.token`)

Example:

```ts
// Generate a new token for each authenticated request
app.use(async function (req, res, next) {
  try {
    await req.loadSession() // Add req.session
    res.setHeader('new-token', await req.generateJWT(req.session))
  } catch (err) {
    // Ignore err
  }
})
```
