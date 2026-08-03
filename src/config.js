/**
 * Upstream provider config.
 * model -> { baseUrl }
 *
 * Clients call this proxy with:
 *   base_url = http://host:port/v1
 *   api_key  = their DeepSeek / Kimi key (forwarded as-is)
 *   model    = one of the names below
 */
export const providers = {
  deepseek: {
    name: "deepseek",
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  kimi: {
    name: "kimi",
    baseUrl: "https://api.moonshot.cn",
    models: [
      "moonshot-v1-8k",
      "moonshot-v1-32k",
      "moonshot-v1-128k",
      "kimi-latest",
      "kimi-thinking-preview",
    ],
  },
};

/** model name -> provider */
export function buildModelMap() {
  const map = new Map();
  for (const provider of Object.values(providers)) {
    for (const model of provider.models) {
      map.set(model, provider);
    }
  }
  return map;
}

export function resolveProvider(model, modelMap) {
  if (!model) return null;
  if (modelMap.has(model)) return modelMap.get(model);

  // prefix: deepseek/deepseek-chat or kimi/moonshot-v1-8k
  const slash = model.indexOf("/");
  if (slash > 0) {
    const prefix = model.slice(0, slash);
    const name = model.slice(slash + 1);
    const byPrefix = providers[prefix];
    if (byPrefix) {
      if (byPrefix.models.includes(name) || modelMap.has(name)) {
        return byPrefix;
      }
      // allow any model under a known provider prefix
      return byPrefix;
    }
  }

  // fallback: match provider name as prefix (deepseek-*)
  for (const provider of Object.values(providers)) {
    if (model.startsWith(provider.name)) return provider;
  }

  return null;
}
