import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // MCP stdio 서버는 실행 가능한 CLI 엔트리라 shebang이 필요하다.
  banner: { js: "#!/usr/bin/env node" },
});
