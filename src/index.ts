import type { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { ZodError, type ZodType } from 'zod';

type Schema<R extends Request> = ZodType | ((req: R) => ZodType);

export type ValidationSchemas<R extends Request = Request> = Partial<
  Record<'body' | 'query' | 'params', Schema<R>>
>;

const PARTS = ['body', 'query', 'params'] as const;

const resolve = <R extends Request>(schema: Schema<R>, req: R): ZodType =>
  typeof schema === 'function' ? schema(req) : schema;

const safeParse = <T>(schema: ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) throw result.error;

  return result.data;
};

const setPart = (req: Request, part: (typeof PARTS)[number], value: unknown) =>
  Object.defineProperty(req, part, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });

export const validationRequest =
  <R extends Request = Request>(schemas: ValidationSchemas<R>) =>
  (request: Request, _res: Response, next: NextFunction): void => {
    const req = request as R;
    let currentPart: (typeof PARTS)[number] = 'body';

    try {
      for (const part of PARTS) {
        const schema = schemas[part];
        if (!schema) continue;

        currentPart = part;
        setPart(req, part, safeParse(resolve(schema, req), req[part]));
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          createHttpError(422, error.issues[0].message, {
            source: currentPart,
            issues: error.issues,
          }),
        );
      }

      next(error);
    }
  };
