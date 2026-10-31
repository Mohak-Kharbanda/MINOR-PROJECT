export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message = "Bad request.", details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = "Authentication required.") {
    return new ApiError(401, message);
  }
  static forbidden(message = "You do not have permission to perform this action.") {
    return new ApiError(403, message);
  }
  static notFound(message = "Not found.") {
    return new ApiError(404, message);
  }
  static conflict(message = "Conflict.") {
    return new ApiError(409, message);
  }
  static tooLarge(message = "Payload too large.") {
    return new ApiError(413, message);
  }
  static unavailable(message = "Service unavailable.") {
    return new ApiError(503, message);
  }
}
