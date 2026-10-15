import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only throws outside a React server build; the DB tests import server modules.
      "server-only": fileURLToPath(new URL("./tests/db/empty.ts", import.meta.url)),
    },
  },
  test: { environment: "node", include: ["tests/db/**/*.test.ts"], fileParallelism: false },
})
