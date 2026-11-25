import noComments from "eslint-plugin-no-comments";
import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";

const disallowComments = {
  plugins: {
    "no-comments": noComments,
  },
  rules: {
    "no-comments/disallowComments": "error",
  },
};

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.svelte-kit/**",
      "**/package/**",
      "**/target/**",
      "src-tauri/target/**",
      ".agents/**",
      "skills/**",
      ".claude/skills/**",
      ".cursor/skills/**",
      "pnpm-lock.yaml",
      "src-tauri/Cargo.lock",
      "vite.config.js",
      "test-results/**",
      "playwright-report/**",
      "blob-report/**",
      ".playwright/**",
      ".playwright-cli/**",
      "storybook-static/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      parser: ts.parser,
    },
    ...disallowComments,
  },
  ...svelte.configs.base,
  {
    files: ["**/*.svelte", "**/*.svelte.{js,ts}"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
    ...disallowComments,
  },
];
