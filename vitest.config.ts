import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost/",
      },
    },
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    globals: false
  },
  resolve: { conditions: ["browser"] }
});
