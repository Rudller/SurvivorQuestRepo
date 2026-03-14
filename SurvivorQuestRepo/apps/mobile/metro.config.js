const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

const escapeForRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toPathRegex = (value) =>
  new RegExp(`^${escapeForRegex(value).replace(/\\\\/g, "[\\\\/]")}(?:[\\\\/].*)?$`);

const backendDistPath = path.resolve(__dirname, "../backend/dist");
const adminNextPath = path.resolve(__dirname, "../admin/.next");
const adminOutPath = path.resolve(__dirname, "../admin/out");
const mobilePnpmPath = path.resolve(__dirname, "node_modules/.pnpm");
const mobilePnpmTempPathRegex = new RegExp(
  `^${escapeForRegex(mobilePnpmPath).replace(/\\\\/g, "[\\\\/]")}(?:[\\\\/].*)?[\\\\/][^\\\\/]*_tmp_[^\\\\/]*(?:[\\\\/].*)?$`
);

config.resolver.blockList = [
  ...(config.resolver.blockList ?? []),
  toPathRegex(backendDistPath),
  toPathRegex(adminNextPath),
  toPathRegex(adminOutPath),
  mobilePnpmTempPathRegex,
];

module.exports = withNativeWind(config, {
  input: "./global.css",
});
