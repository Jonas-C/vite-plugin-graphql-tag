import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    test: {
      include: ["tests/**/*.test.ts"],
      globals: true,
    },
    plugins: [],
  };
});
