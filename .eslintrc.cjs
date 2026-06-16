module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs", "vite.config.ts", "functions", "coverage"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh", "react-hooks"],
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  overrides: [
    {
      // Node-run maintenance scripts (tsx): allow Node globals & console.
      files: ["scripts/**/*.ts"],
      env: { browser: false, node: true },
      rules: {
        "no-console": "off",
      },
    },
  ],
};
