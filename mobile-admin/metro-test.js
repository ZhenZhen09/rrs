const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
console.log("Metro Resolver Main Fields:", config.resolver.resolverMainFields);
console.log("Metro Source Exts:", config.resolver.sourceExts);
