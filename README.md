# express-zod-guard

Express middleware that validates `body`, `query` and `params` with Zod and forwards failures as `http-errors` errors.

## Features

- Validates `body`, `query` and `params` in a single call
- Replaces `req.body`, `req.query` and `req.params` with the parsed data, so coercion, defaults and stripped keys apply
- Schemas can be plain Zod schemas or functions that receive `req`
- Failures call `next()` with a 422 error that carries the failing part and every Zod issue
- Works with Express 4 and Express 5

## Install

```bash
npm i express-zod-guard
```

Peer dependencies: `express` and `zod`.

## Usage

```typescript
import express from 'express';
import { z } from 'zod';
import { validationRequest } from 'express-zod-guard';

const app = express();
app.use(express.json());

const body = z.object({
  name: z.string().min(3),
  email: z.email(),
  age: z.number().min(18),
});

const query = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

const params = z.object({
  id: z.uuid(),
});

app.post(
  '/users/:id',
  validationRequest({ body, query, params }),
  (req, res) => {
    const { name, email, age } = req.body;
    const { page, limit } = req.query;
    const { id } = req.params;

    res.json({ success: true });
  },
);
```

## Schemas that use the request

Pass a function instead of a schema to read data attached by earlier middleware, such as the authenticated user.

```typescript
import type { Request } from 'express';

const create = {
  body: (req: Request) =>
    z.object({
      deliverTo: z.string().refine((value) => value === req.self.linkedTo, {
        error: 'Invalid outlet',
      }),
    }),
};

router.post('/', validationRequest(create), handler);
```

Attach the data before `validationRequest` runs:

```typescript
router.use(authenticate);
router.post('/', validationRequest(create), handler);
```

Type the attached data once with a global declaration:

```typescript
declare global {
  namespace Express {
    interface Request {
      self: { _id: string; linkedTo: string };
    }
  }
}

export {};
```

To type the request per route instead, pass it as a generic: `validationRequest<SelfRequest>(schemas)`.

## Error handling

On failure the middleware calls `next()` with a `422 Unprocessable Entity` error from `http-errors`. The error has two extra properties:

| Property | Description                                       |
| -------- | ------------------------------------------------- |
| `source` | The part that failed: `body`, `query` or `params` |
| `issues` | The full array of Zod issues                      |

The message is the first issue's message. Return it from your error handler:

```typescript
app.use((err, req, res, next) => {
  res.status(err.status ?? 500).json({
    status: 'fail',
    message: err.message,
    source: err.source,
    issues: err.issues,
  });
});
```

Example response:

```json
{
  "status": "fail",
  "message": "Invalid email address",
  "source": "body",
  "issues": [
    {
      "code": "invalid_format",
      "path": ["email"],
      "message": "Invalid email address"
    }
  ]
}
```

Errors that are not Zod errors are passed to `next()` unchanged.

## Notes

- Parts without a schema are left untouched. Validate every part your route reads.
- `z.object()` strips unknown keys. Avoid `z.looseObject()` and `.passthrough()` on create and update routes.
- Validation is synchronous. Async refinements are not supported.
- Validation does not replace authorization. Check ownership in your service as well.

## API

```typescript
validationRequest<R extends Request = Request>(schemas: ValidationSchemas<R>): RequestHandler
```

```typescript
type ValidationSchemas<R extends Request = Request> = {
  body?: ZodType | ((req: R) => ZodType);
  query?: ZodType | ((req: R) => ZodType);
  params?: ZodType | ((req: R) => ZodType);
};
```

## License

MIT
