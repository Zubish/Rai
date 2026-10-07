import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const localEnvFile = resolve(process.cwd(), ".env.local");

if (existsSync(localEnvFile)) {
  for (const line of readFileSync(localEnvFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[2].startsWith("#") || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}
