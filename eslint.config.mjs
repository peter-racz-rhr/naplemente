import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Vendored registry code (mapcn, Liquefy UI) predates the React Compiler
    // lint rules; keep it as published so it can be updated from upstream.
    files: [
      "src/components/ui/map.tsx",
      "src/lib/styles-prop.ts",
      "src/hooks/use-liquid-glass.ts",
    ],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/use-memo": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Copied from node_modules on install.
    "public/maplibre/**",
  ]),
]);

export default eslintConfig;
