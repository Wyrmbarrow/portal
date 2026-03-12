#!/usr/bin/env node
// Reads PORT from .env.local before starting next dev.
// Next.js binds the port before loading .env.local, so we do it here.

const fs = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");

let port = 3000;
try {
  const env = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
  const match = env.match(/^PORT=(\d+)/m);
  if (match) port = parseInt(match[1], 10);
} catch {
  // .env.local missing or unreadable — fall back to 3000
}

const result = spawnSync(
  "node",
  ["node_modules/next/dist/bin/next", "dev", "--port", String(port)],
  { stdio: "inherit", cwd: path.join(__dirname, "..") }
);

process.exit(result.status ?? 0);
