module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Must be last. Reanimated 4 drives its worklets through this.
      'react-native-worklets/plugin',
    ],
  }
}
