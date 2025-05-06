import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import globals from "globals"; // Recommended for specifying environments

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize FlatCompat
const compat = new FlatCompat({
  baseDirectory: __dirname,
  // resolvePluginsRelativeTo: __dirname, // Optional: Helps resolve plugins if needed
});

// Define the configuration array
const eslintConfig = [
  // Apply base configurations from next/core-web-vitals and next/typescript
  ...compat.extends("next/core-web-vitals"), // Apply core web vitals rules

  // Add a specific configuration object for TypeScript files, extending the TS preset
  {
    files: ["**/*.ts", "**/*.tsx"], // Apply to all TS/TSX files, including functions/src
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./functions/tsconfig.json"], // Include both tsconfig files
      },
    },
    // Use FlatCompat to extend the Next.js TypeScript configuration within this block
    ...compat.extends("plugin:@typescript-eslint/recommended", "next/typescript"),
  },

  // Add a separate configuration object for our custom rule overrides
  // This applies globally unless restricted by a 'files' pattern
  {
    languageOptions: {
        globals: {
            ...globals.node, // Define Node.js global variables
            ...globals.es2021, // Define ES2021 globals
        },
    },
    rules: {
      // --- Rules Relaxed/Modified ---
      "quotes": ["warn", "double", { "allowTemplateLiterals": true }],
      // Set max-len to 160 and make it a warning (1) instead of error (2 or "error")
      "max-len": ["warn", { "code": 160, "ignoreComments": true, "ignoreUrls": true, "ignoreStrings": true, "ignoreTemplateLiterals": true }],
      "indent": "off", // Turn off strict indentation rule
      "object-curly-spacing": ["warn", "always"], // Allow spaces inside curly braces
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], // Warn on unused vars
      "@typescript-eslint/no-explicit-any": "warn", // Warn instead of error for 'any' type
      "require-jsdoc": "off", // Turn off requirement for JSDoc comments
      "valid-jsdoc": "off", // Turn off JSDoc validation
      "new-cap": "off", // Allow non-capitalized constructors
      "camelcase": ["warn", { "properties": "never" }], // Warn on non-camelcase vars
      "import/no-unresolved": "off", // Often conflicts with TS paths
      "no-trailing-spaces": "warn",
      "eol-last": ["warn", "always"],
      // Add other specific overrides if needed
    },
     ignores: ["**/node_modules/", "**/lib/", "**/.next/"], // Ignore node_modules, compiled lib, and next build output
  }
];

export default eslintConfig;
