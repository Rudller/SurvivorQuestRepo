import expoConfig from "eslint-config-expo/flat.js";

export default [
  ...expoConfig,
  {
    rules: {
      "react-hooks/rules-of-hooks": "warn",
      // eslint-config-expo enables the React Compiler migration rules even
      // though this app does not enable the compiler. The existing animation,
      // sensor and native-event code intentionally uses mutable refs and
      // effect-driven state. Keep the stable Hooks checks enabled and revisit
      // these rules when the compiler is deliberately introduced together
      // with visual regression coverage for those interactions.
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: [".expo-test-bundle-ci/**", "dist/**", "coverage/**"],
  },
];
