/**
 * Helper to validate and enforce pagination limits
 */
export function getPaginationParams(searchParams: URLSearchParams, maxLimit = 100, defaultLimit = 20) {
  let limit = parseInt(searchParams.get("limit") || String(defaultLimit), 10);
  if (isNaN(limit) || limit <= 0) {
    limit = defaultLimit;
  }
  
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  let page = parseInt(searchParams.get("page") || "1", 10);
  if (isNaN(page) || page <= 0) {
    page = 1;
  }

  return {
    limit,
    page,
    skip: (page - 1) * limit
  };
}
