import Schema from '@deepseek-ai/schemastery';
import { DEFAULT_SETTINGS, normalizeSettings } from './core/policy.js';
import { createNativeAdapter } from './host/native-adapter.js';
import { registerLifecycle } from './host/lifecycle.js';
import { registerCommands } from './host/commands.js';
import { CompactSettingsService, registerSettingsTool } from './host/settings.js';

export const name = 'custom-compact';
export const inject = ['agents', 'commands', 'tools', 'settings'];

const model = Schema.object({
  provider: Schema.string().min(1).required(),
  model: Schema.string().min(1).required(),
  reasoningEffort: Schema.string().min(1).default(null),
}).default(null);

export const Config = Schema.object({
  settings: Schema.object({
    thresholdMode: Schema.union(['percentage', 'absolute']).default('percentage'),
    thresholdPercent: Schema.number().min(Number.MIN_VALUE).max(100).default(null),
    thresholdTokens: Schema.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(null),
    compactModel: model,
  }).default(DEFAULT_SETTINGS).description('所有会话共享的压缩模型和阈值设置').volatile(),
});

export function apply(ctx, config) {
  const adapter = createNativeAdapter(ctx, () => normalizeSettings(config.settings.get()));
  const settings = new CompactSettingsService(ctx, config, adapter);
  registerLifecycle(ctx, adapter);
  registerCommands(ctx, adapter);
  registerSettingsTool(ctx, settings);
  ctx.effect(() => ctx.settings.configure({ auto: false }));
  ctx.effect(() => () => adapter.dispose());
}
