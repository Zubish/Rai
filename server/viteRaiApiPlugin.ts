import type { Plugin } from "vite";
import { handleRaiApiRequest } from "./raiHttp";

export function raiApiPlugin(): Plugin {
  return {
    name: "rai-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const handled = await handleRaiApiRequest(request, response);
        if (!handled) {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const handled = await handleRaiApiRequest(request, response);
        if (!handled) {
          next();
        }
      });
    }
  };
}
