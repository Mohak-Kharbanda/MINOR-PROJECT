import { Response } from "express";
import type { Pagination } from "@edutrack/shared";

/** Every success response has the shape { success: true, data, message?, pagination? }. */
export function ok<T>(res: Response, data: T, extra: { message?: string; pagination?: Pagination; status?: number } = {}) {
  const { status = 200, ...rest } = extra;
  return res.status(status).json({ success: true, data, ...rest });
}

export function created<T>(res: Response, data: T, message?: string) {
  return ok(res, data, { status: 201, message });
}

export function paginate(page: number, limit: number, total: number): Pagination {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** Escapes user input before it is used inside a RegExp (prevents ReDoS / injection). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function searchRegex(input: string): RegExp {
  return new RegExp(escapeRegex(input), "i");
}
