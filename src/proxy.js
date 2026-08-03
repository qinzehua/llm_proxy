import { Readable } from "node:stream";
import { providers, resolveProvider } from "./config.js";

function extractModel(req) {
  if (req.body && typeof req.body === "object" && req.body.model) {
    return String(req.body.model);
  }
  if (req.query?.model) return String(req.query.model);
  return null;
}

function listLocalModels() {
  const data = [];
  for (const provider of Object.values(providers)) {
    for (const id of provider.models) {
      data.push({
        id,
        object: "model",
        created: 0,
        owned_by: provider.name,
      });
    }
  }
  return { object: "list", data };
}

/**
 * Forward the original request to the provider base URL.
 * Path, body, and Authorization (from third party) are forwarded as-is.
 */
export function createProxyHandler(modelMap) {
  return async function proxyHandler(req, res) {
    try {
      if (req.method === "GET" && (req.path === "/models" || req.path === "/models/")) {
        return res.json(listLocalModels());
      }

      const model = extractModel(req);
      const provider = resolveProvider(model, modelMap);

      if (!provider) {
        return res.status(400).json({
          error: {
            message: model
              ? `Unknown model: ${model}. Configure it in src/config.js`
              : "Request body must include a model field so the proxy can route",
            type: "invalid_request_error",
            code: "model_not_found",
          },
        });
      }

      // If client used prefix form kimi/moonshot-v1-8k, strip prefix for upstream
      const body = req.body && typeof req.body === "object" ? { ...req.body } : req.body;
      if (body?.model && String(body.model).includes("/")) {
        body.model = String(body.model).split("/").slice(1).join("/") || body.model;
      }

      const targetPath = req.originalUrl.split("?")[0];
      const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      const targetUrl = `${provider.baseUrl.replace(/\/$/, "")}${targetPath}${query}`;

      const headers = {
        authorization: req.headers.authorization,
        accept: req.headers.accept || "application/json",
        "user-agent": req.headers["user-agent"] || "llm-proxy",
      };
      if (req.headers["content-type"]) {
        headers["content-type"] = req.headers["content-type"];
      }

      const init = { method: req.method, headers };

      if (req.method !== "GET" && req.method !== "HEAD" && body !== undefined) {
        init.body = JSON.stringify(body);
        headers["content-type"] = "application/json";
      }

      const upstream = await fetch(targetUrl, init);

      res.status(upstream.status);
      upstream.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (
          lower === "transfer-encoding" ||
          lower === "connection" ||
          lower === "content-encoding" ||
          lower === "content-length"
        ) {
          return;
        }
        res.setHeader(key, value);
      });

      const contentType = upstream.headers.get("content-type") || "";
      if (
        contentType.includes("text/event-stream") ||
        contentType.includes("application/octet-stream")
      ) {
        Readable.fromWeb(upstream.body).pipe(res);
        return;
      }

      res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (err) {
      const status = err.status || 502;
      console.error("[proxy]", err.message);
      if (!res.headersSent) {
        res.status(status).json({
          error: {
            message: err.message || "Upstream request failed",
            type: "proxy_error",
            code: err.code || "upstream_error",
          },
        });
      }
    }
  };
}
