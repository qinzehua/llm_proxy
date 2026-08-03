/**
 * PM2 process file for llm_proxy.
 * Usage: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "llm-proxy",
      script: "src/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      // App loads .env via dotenv; keep cwd as deploy root.
      cwd: __dirname,
    },
  ],
};
