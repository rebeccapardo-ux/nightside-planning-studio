import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// eslint-config-next already registers jsx-a11y as a plugin but only
// enables a small subset of its rules. Pull in the full `recommended`
// ruleset to catch the rest at lint time. Targets WCAG 2.1 AA where
// the rules map; runtime checks (color contrast, focus visibility)
// still need axe/Lighthouse.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{jsx,tsx}"],
    rules: jsxA11y.configs.recommended.rules,
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
