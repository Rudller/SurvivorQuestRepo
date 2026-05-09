import expoConfig from "eslint-config-expo/flat.js";

export default [
  ...expoConfig,
  {
    rules: {
      "react-hooks/rules-of-hooks": "warn",
    },
  },
  {
    ignores: [".expo-test-bundle-ci/**", "dist/**", "coverage/**"],
  },
];
