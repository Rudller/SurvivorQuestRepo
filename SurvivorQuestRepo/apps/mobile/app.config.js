// Wariant "development" (profil EAS `development`) dostaje osobny identyfikator,
// żeby dev build i APK `beta` mogły stać obok siebie na jednym tablecie.
const IS_DEV_VARIANT = process.env.APP_VARIANT === "development";

module.exports = ({ config }) => {
  if (!IS_DEV_VARIANT) {
    return config;
  }

  return {
    ...config,
    name: `${config.name} (dev)`,
    ios: { ...config.ios, bundleIdentifier: `${config.ios.bundleIdentifier}.dev` },
    android: { ...config.android, package: `${config.android.package}.dev` },
  };
};
