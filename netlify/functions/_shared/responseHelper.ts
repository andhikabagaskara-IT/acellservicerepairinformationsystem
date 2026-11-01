import type { HandlerResponse } from "@netlify/functions";

/**
 * Standard JSON success response.
 */
export function success<T>(
  data: T,
  statusCode = 200,
  extraHeaders?: Record<string, string>
): HandlerResponse {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({ success: true, data }),
  };
}

/**
 * Standard JSON error response.
 */
export function error(
  message: string,
  statusCode = 400,
  details?: unknown,
  extraHeaders?: Record<string, string>
): HandlerResponse {
  const body: Record<string, unknown> = { success: false, error: message };
  if (details) body.details = details;

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Paginated success response.
 */
export function paginated<T>(
  data: T[],
  page: number,
  perPage: number,
  total: number,
  statusCode = 200
): HandlerResponse {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      success: true,
      data,
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    }),
  };
}

/**
 * Method Not Allowed response.
 */
export function methodNotAllowed(allowed: string[] = ["GET", "POST"]): HandlerResponse {
  return {
    statusCode: 405,
    headers: {
      "Content-Type": "application/json",
      Allow: allowed.join(", "),
    },
    body: JSON.stringify({
      success: false,
      error: `Method not allowed. Allowed: ${allowed.join(", ")}`,
    }),
  };
}
