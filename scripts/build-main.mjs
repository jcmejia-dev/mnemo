import { build } from "esbuild";
await build({
  entryPoints: ["src/main/index.ts"],
  outfile: "dist-electron/main/index.cjs",
  bundle: true,
  packages: "external",
  platform: "node",
  format: "cjs",
  target: "node24",
  sourcemap: true,
  define: { "import.meta.url": "__mnemoMetaUrl" },
  banner: {
    js: 'const __mnemoMetaUrl = require("node:url").pathToFileURL(__filename).href;',
  },
});
