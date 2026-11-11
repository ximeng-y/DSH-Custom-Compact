import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { normalizeSettings } from '../core/policy.js';

export const ENTRY_ID = 'custom-compact';
const remoteInitializers = [];

export class CompactSettingsService extends TypertRemoteService {
  constructor(ctx, config, adapter) {
    super(ctx, 'customCompact');
    this.config = config;
    this.adapter = adapter;
    for (const initialize of remoteInitializers) initialize.call(this);
  }

  status(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId) throw new TypeError('需要会话标识。');
    return this.adapter.status(this.ctx.agents.get(sessionId));
  }

  read(agent) {
    const form = this.ctx.settings.describe({ redactSecrets: true }).find((item) => item.ns === ENTRY_ID);
    return {
      settings: normalizeSettings(this.config.settings.get()),
      revision: form?.revision ?? null,
      runtime: this.adapter.status(agent),
    };
  }

  async update(agent, patch, expectedRevision, signal) {
    signal.throwIfAborted();
    if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new TypeError('set 操作需要 settings 对象。');
    }
    const before = this.read(agent);
    if (before.revision === null) throw new Error('当前 profile 没有可写的插件设置表单。');
    const candidate = normalizeSettings({ ...before.settings, ...patch });
    await this.ctx.settings.update(ENTRY_ID, { settings: candidate }, expectedRevision ?? before.revision);
    return this.read(agent);
  }
}

// 用公开装饰器初始化协议标记，保持纯 JavaScript，无需编译器或手写私有标记。
Remote({ resources: { session: (sessionId) => sessionId } })(CompactSettingsService.prototype.status, {
  kind: 'method', name: 'status', private: false, static: false,
  addInitializer(initialize) { remoteInitializers.push(initialize); },
});

// 宿主配置表单与工具校验共用同一 JSON Schema 子集，不支持数值范围与字符串长度关键字，
// 因此这里只描述结构，取值范围由 core/policy.js 的 normalizeSettings 负责。
const nullable = (schema) => ({ oneOf: [schema, { type: 'null' }] });
const modelSchema = nullable({
  type: 'object',
  properties: {
    provider: { type: 'string', description: '模型目录中的 provider 路由。' },
    model: { type: 'string', description: '该 provider 下的模型标识。' },
    reasoningEffort: nullable({ type: 'string', description: '该模型支持的思考强度；空值使用默认。' }),
  },
  required: ['provider', 'model'], additionalProperties: false,
});
const properties = {
  thresholdMode: { type: 'string', enum: ['percentage', 'absolute'], description: '只应用所选模式，另一模式的数值保留。' },
  thresholdPercent: nullable({ type: 'number', description: '原生安全余量策略的百分比，空值沿用原生策略。' }),
  thresholdTokens: nullable({ type: 'number', description: '小于主模型窗口时严格使用该值，否则沿用原生策略。' }),
  compactModel: { ...modelSchema, description: '自定义压缩模型；空值使用当前会话主模型。' },
};

export function registerSettingsTool(ctx, service) {
  ctx.tools.register({
    name: 'custom_compact_settings',
    description: '读取或更新当前 profile 内所有会话共享的压缩模型、思考强度与阈值设置。返回设置、revision 和当前会话的适配状态；不会触发压缩。',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get', 'set'], description: 'get 读取；set 保存提供的字段。' },
        settings: { type: 'object', properties, additionalProperties: false, description: 'set 时必填；未提供的字段保留，显式空值恢复默认。' },
        expectedRevision: { type: 'integer', description: '可提供 get 返回的 revision；冲突时拒绝保存。' },
      },
      required: ['action'], additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          settings: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false },
          revision: nullable({ type: 'integer' }),
          runtime: {
            type: 'object',
            properties: {
              state: { type: 'string', enum: ['active', 'unsupported', 'unavailable'] },
              reason: nullable({ type: 'string' }),
              automatic: nullable({ type: 'boolean' }),
            },
            required: ['state', 'reason', 'automatic'], additionalProperties: false,
          },
        },
        required: ['settings', 'revision', 'runtime'], additionalProperties: false,
      },
      render(_args, value) { return [{ type: 'text', text: JSON.stringify(value, null, 2) }]; },
    },
    async execute(args, exec) {
      if (args.action === 'get') return service.read(exec.agent);
      if (args.action !== 'set') throw new TypeError('action 必须是 get 或 set。');
      return service.update(exec.agent, args.settings, args.expectedRevision, exec.signal);
    },
    isConcurrencySafe(args) { return args.action === 'get'; },
  });
}
