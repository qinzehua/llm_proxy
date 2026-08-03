import "dotenv/config";
import express from "express";
import { authMiddleware } from "./auth.js";
import { buildModelMap, providers } from "./config.js";
import { createProxyHandler } from "./proxy.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const modelMap = buildModelMap();

app.use(express.json({ limit: process.env.BODY_LIMIT || "10mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    providers: Object.fromEntries(
      Object.values(providers).map((p) => [
        p.name,
        { baseUrl: p.baseUrl, models: p.models },
      ])
    ),
  });
});

// OpenAI-compatible base URL: clients set base_url to http://host:port/v1
app.use("/v1", authMiddleware, createProxyHandler(modelMap));

app.use((_req, res) => {
  res.status(404).json({
    error: {
      message: "Not found. Use base_url ending with /v1 (e.g. /v1/chat/completions)",
      type: "invalid_request_error",
    },
  });
});

app.listen(port, () => {
  const models = [...modelMap.keys()].join(", ");
  console.log(`LLM proxy listening on http://localhost:${port}`);
  console.log(`OpenAI-compatible base_url: http://localhost:${port}/v1`);
  console.log(`Models: ${models}`);
});
