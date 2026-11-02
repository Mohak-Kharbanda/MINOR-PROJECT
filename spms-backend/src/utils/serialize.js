/**
 * Small helpers for turning (possibly populated) Mongoose values into the
 * plain DTO shapes in @edutrack/shared. Populated refs are objects with an
 * _id; unpopulated ones are ObjectIds.
 */

export function idOf(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value._id) return value._id.toString();
  return value.toString();
}

export function iso(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function userRef(value) {
  if (!value || !value._id) return null;
  const ref = { id: value._id.toString(), name: value.name, email: value.email };
  if (value.role) ref.role = value.role;
  if (value.usn) ref.usn = value.usn;
  return ref;
}

export function departmentRef(value) {
  if (!value || !value._id) return null;
  return { id: value._id.toString(), name: value.name, code: value.code };
}

export const USER_REF_FIELDS = "name email role usn";
export const DEPARTMENT_REF_FIELDS = "name code";
