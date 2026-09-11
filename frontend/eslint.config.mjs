import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx,js,mjs}"],
    ignores: ["src/lib/storage/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message:
            "Direct access to localStorage is forbidden outside src/lib/storage/. Use repositories in src/lib/repositories/ instead.",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "localStorage",
          message:
            "Direct access to window.localStorage is forbidden outside src/lib/storage/. Use repositories in src/lib/repositories/ instead.",
        },
        {
          object: "globalThis",
          property: "localStorage",
          message:
            "Direct access to globalThis.localStorage is forbidden outside src/lib/storage/. Use repositories in src/lib/repositories/ instead.",
        },
      ],
    },
  },
]);

export default eslintConfig;
