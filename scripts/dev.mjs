import { build, preview } from "vite";

const projectRoot = process.cwd();
const root = projectRoot;

const explicitPortIndex = process.argv.indexOf("--port");
const port = explicitPortIndex >= 0 ? Number(process.argv[explicitPortIndex + 1]) : 5173;

console.log("Building playable dev bundle...");
await build({
  root
});

const server = await preview({
  root,
  preview: {
    host: "127.0.0.1",
    port,
    strictPort: false
  }
});

server.printUrls();

process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
