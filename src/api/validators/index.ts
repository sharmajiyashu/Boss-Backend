import { z } from 'zod';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ParsedQs } from 'qs';
import { ParamsDictionary } from 'express-serve-static-core';

type Source = 'body' | 'query' | 'params';

export const validate =
  <T extends z.ZodTypeAny>(schema: T, source: Source = 'body'): RequestHandler =>
    (req: Request, _res: Response, next: NextFunction) => {
      const result = schema.safeParse(
        source === 'body' ? req.body : source === 'query' ? req.query : req.params
      );
      if (!result.success) return next(result.error);
      if (source === 'body') req.body = result.data;
      else if (source === 'query') req.query = result.data as unknown as ParsedQs;
      else req.params = result.data as unknown as ParamsDictionary;
      next();
    };
