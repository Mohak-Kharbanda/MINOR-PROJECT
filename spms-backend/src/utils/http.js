/** Every success response has the shape { success: true, data, message?, pagination? }. */
export function ok(res, data, extra = {}) {
  const { status = 200, ...rest } = extra;
  return res.status(status).json({ success: true, data, ...rest });
}

export function created(res, data, message) {
  return ok(res, data, { status: 201, message });
}

export function paginate(page, limit, total) {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** Escapes user input before it is used inside a RegExp (prevents ReDoS / injection). */
export function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function searchRegex(input) {
  return new RegExp(escapeRegex(input), "i");
}
