import { spawn } from "node:child_process";

const processes = [
  spawn(process.execPath, ["server/index.mjs"], { stdio: "inherit", env: process.env }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js", ...process.argv.slice(2)], { stdio: "inherit", env: process.env })
];

function shutdown() {
  for (const process of processes) process.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
processes.forEach(process => process.on("exit", code => {
  if (code && code !== 0) process.exitCode = code;
}));
