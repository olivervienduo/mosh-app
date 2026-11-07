// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/*'],
  },
  {
    rules: {
      // Screens load data in effects (fetch -> setState). That is intended here.
      'react-hooks/set-state-in-effect': 'off',
      // expo-notifications re-exports its enums from .d.ts files the import plugin can't follow.
      'import/namespace': 'off',
    },
  },
]);
