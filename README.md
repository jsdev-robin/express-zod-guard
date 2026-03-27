# Validation Request Middleware

Express middleware for validating request data using Zod schemas with automatic HTTP exception handling.

## Features

- **Multi-location validation**: Validates `body`, `query`, and `params` simultaneously
- **Type-safe**: Uses Zod schemas for runtime type validation
- **Automatic error handling**: Converts Zod validation errors to HTTP exceptions
- **Early failure**: Returns first validation error with 422 status code
- **Seamless integration**: Overwrites request properties with parsed/validated data

## Example Usage

```typescript
import { validationRequest } from './middleware';
import { z } from 'zod';

// Define schemas
const userSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().min(18),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

// Apply middleware to route
app.post(
  '/users/:id',
  validationRequest({
    body: userSchema,
    query: querySchema,
    params: paramsSchema,
  }),
  (req, res) => {
    // req.body, req.query, and req.params are now validated and typed
    const { name, email, age } = req.body;
    const { page, limit } = req.query;
    const { id } = req.params;

    res.json({ success: true });
  },
);
```

## Error Response

When validation fails, the middleware returns:

```json
{
  "statusCode": 422,
  "status": "fail",
  "message": "Invalid email address"
}
```

## Key Benefits

- **Centralized validation logic**: Keep validation separate from route handlers
- **Type inference**: Zod schemas provide TypeScript type safety
- **Clean error handling**: Consistent error format for all validation failures
- **Performance**: Only validates specified request parts
- **Flexible**: Can validate any combination of body, query, and params
