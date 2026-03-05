const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

const escapeForRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const backendDistPath = path.resolve(__dirname, "../backend/dist");
const backendDistRegex = new RegExp(
  `^${escapeForRegex(backendDistPath).replace(/\\\\/g, "[\\\\/]")}(?:[\\\\/].*)?$`,
);

config.resolver.blockList = [...(config.resolver.blockList ?? []), backendDistRegex];

module.exports = withNativeWind(config, {
	input: "./global.css",
});
