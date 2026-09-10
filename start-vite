#!/usr/bin/env node
import { createServer } from "vite";

const server = await createServer({
  configFile: true,
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "5173"),
  },
});
await server.listen();
server.printUrls();
