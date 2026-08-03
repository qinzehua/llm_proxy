/**
 * Require Authorization from the third-party client.
 * The key is passed through to the upstream provider as-is.
 */
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const key = match?.[1]?.trim();

  if (!key) {
    return res.status(401).json({
      error: {
        message: "Missing API key. Send Authorization: Bearer <api_key>",
        type: "invalid_request_error",
        code: "invalid_api_key",
      },
    });
  }

  req.apiKey = key;
  next();
}
