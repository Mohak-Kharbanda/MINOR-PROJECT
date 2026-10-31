import { NextFunction, Request, Response } from "express";
import { z, ZodType } from "zod";
import { objectId } from "@edutrack/shared";
import { ApiError } from "../utils/ApiError";

type Target = "body" | "query" | "params";

/** Validates req[target] against a Zod schema and replaces it with the parsed value. */
export function validate(schema: ZodType, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target] ?? {});
    if (!result.success) {
      const flat = z.flattenError(result.error);
      const first =
        Object.values(flat.fieldErrors as Record<string, string[] | undefined>).flat()[0] ||
        flat.formErrors[0] ||
        "Validation failed.";
      return next(ApiError.badRequest(first as string, flat));
    }
    (req as any)[target] = result.data;
    next();
  };
}

/** Rejects malformed ObjectIds in route params with a 400 instead of a cast error. */
export function validateIds(...names: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const name of names) {
      const value = req.params[name];
      if (value !== undefined && !objectId.safeParse(value).success) {
        return next(ApiError.badRequest(`Invalid ${name}.`));
      }
    }
    next();
  };
}
