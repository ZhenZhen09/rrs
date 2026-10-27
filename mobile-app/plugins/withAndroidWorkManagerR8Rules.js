const fs = require('node:fs/promises');
const path = require('node:path');
const { withDangerousMod } = require('@expo/config-plugins');

const WORK_MANAGER_RULES = [
  '-keep class * extends androidx.room.RoomDatabase { <init>(); }',
  '-keep class * extends androidx.work.InputMerger { <init>(); }',
];

function withAndroidWorkManagerR8Rules(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const rulesFile = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro',
      );
      const currentRules = await fs.readFile(rulesFile, 'utf8').catch((error) => {
        if (error.code === 'ENOENT') return '';
        throw error;
      });
      const missingRules = WORK_MANAGER_RULES.filter((rule) => !currentRules.includes(rule));

      if (missingRules.length > 0) {
        await fs.appendFile(
          rulesFile,
          `${currentRules.endsWith('\n') || currentRules.length === 0 ? '' : '\n'}\n# Preserve WorkManager and Room constructors instantiated reflectively by SDK 58.\n${missingRules.join('\n')}\n`,
        );
      }

      return config;
    },
  ]);
}

module.exports = withAndroidWorkManagerR8Rules;
module.exports.WORK_MANAGER_RULES = WORK_MANAGER_RULES;
