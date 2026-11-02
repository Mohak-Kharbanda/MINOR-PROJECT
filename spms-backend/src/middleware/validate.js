import { z } from "zod";
import { objectId } from "@edutrack/shared";
import { ApiError } from "../utils/ApiError.js";

/** Validates req[target] against a Zod schema and replaces it with the parsed value. */
export function validate(schema, target = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target] ?? {});
    if (!result.success) {
      const flat = z.flattenError(result.error);
      const first = Object.values(flat.fieldErrors).flat()[0] || flat.formErrors[0] || "Validation failed.";
      return next(ApiError.badRequest(first, flat));
    }
    req[target] = result.data;
    next();
  };
}

/** Rejects malformed ObjectIds in route params with a 400 instead of a cast error. */
export function validateIds(...names) {
  return (req, _res, next) => {
    for (const name of names) {
      const value = req.params[name];
      if (value !== undefined && !objectId.safeParse(value).success) {
        return next(ApiError.badRequest(`Invalid ${name}.`));
      }
    }
    next();
  };
}
