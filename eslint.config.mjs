// @ts-check
import { fileURLToPath } from "url";
import { dirname } from "path";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "error",
      // Numbers stringify predictably (unlike objects/arrays); the codebase
      // relies on this throughout for ports, day counts, exit codes, etc.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      // This codebase's convention is static-only "command" classes as
      // namespaces for related OpenSSL/validation operations.
      "@typescript-eslint/no-extraneous-class": "off",
      // Static methods referenced by class name (e.g. `GenKeyCommand.generatePrivateKey`,
      // used directly as adapter implementations) don't carry an instance `this`.
      // Do NOT re-add `ignoreStatic: true`. It was set here once, and in the same
      // commit an IPC adapter started passing `X509Command.parseMetadata` as a
      // bare reference — detaching it from its class, so `this.extractField`
      // inside it blew up at runtime. Certificate issuance was broken in a
      // shipped release and neither typecheck nor lint said a word. Static
      // methods are exactly the case this rule needs to cover.
      "@typescript-eslint/unbound-method": "error",
      // The codebase deliberately uses `||` to collapse both "" and undefined
      // to a fallback (optional form fields, default error messages) — `??`
      // would stop treating an empty string as "absent" and change behavior.
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      // `window.electron` is typed as always-present for call-site ergonomics,
      // but is only real once Electron's preload has run (e.g. `window.open`
      // browser fallbacks defend against a plain browser tab). IPC generics
      // like `invoke<T>()` are also a client-side assertion, not a guarantee
      // of what actually comes back over the wire.
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  {
    // Test doubles/mocks legitimately trade type safety for flexibility
    // (e.g. a hand-rolled better-sqlite3 mock); don't fight that here.
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-this-alias": "off",
    },
  },
  {
    // `packages/core` is bundled into the Electron *renderer* as well as the
    // main process. A Node built-in import here makes Rollup emit
    // `const r = require, c = r("crypto")` into the browser bundle, which throws
    // `ReferenceError: require is not defined` before React mounts — the window
    // comes up completely blank. That shipped in 0.1.6.
    files: ["packages/core/src/**/*.ts"],
    ignores: ["packages/core/src/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*"],
              message:
                "packages/core must stay runtime-agnostic — it is bundled into the renderer. Use a web-standard API (globalThis.crypto) or move this to packages/infrastructure.",
            },
          ],
          paths: [
            "crypto",
            "fs",
            "path",
            "os",
            "child_process",
            "util",
            "stream",
            "buffer",
          ].map((name) => ({
            name,
            message:
              "packages/core must stay runtime-agnostic — it is bundled into the renderer.",
          })),
        },
      ],
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/.vite/**",
      "**/out/**",
    ],
  }
);
