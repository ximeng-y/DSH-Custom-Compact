export const DEFAULT_SETTINGS = Object.freeze({
  thresholdMode: 'percentage',
  thresholdPercent: null,
  thresholdTokens: null,
  compactModel: null,
});

function assertRecord(value, keys, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} 必须是对象。`);
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) throw new TypeError(`${label} 包含未知字段 ${key}。`);
  }
}

// 从 volatile 配置建立不可变快照，压缩中不再读取全局设置。
export function normalizeSettings(source = {}) {
  assertRecord(source, Object.keys(DEFAULT_SETTINGS), 'settings');
  const settings = { ...DEFAULT_SETTINGS, ...source };
  if (!['percentage', 'absolute'].includes(settings.thresholdMode)) {
    throw new TypeError('thresholdMode 必须是 percentage 或 absolute。');
  }
  const percent = settings.thresholdPercent;
  if (percent !== null && (!Number.isFinite(percent) || percent <= 0 || percent > 100)) {
    throw new TypeError('百分比必须大于 0 且不超过 100，或为空。');
  }
  const tokens = settings.thresholdTokens;
  if (tokens !== null && (!Number.isSafeInteger(tokens) || tokens <= 0)) {
    throw new TypeError('绝对 token 阈值必须是正的安全整数，或为空。');
  }
  if (settings.compactModel !== null) {
    const model = settings.compactModel;
    assertRecord(model, ['provider', 'model', 'reasoningEffort'], 'compactModel');
    for (const key of ['provider', 'model']) {
      if (typeof model[key] !== 'string' || model[key].trim().length === 0) {
        throw new TypeError('压缩模型必须同时指定非空 provider 和 model。');
      }
    }
    const effort = model.reasoningEffort ?? null;
    if (effort !== null && (typeof effort !== 'string' || effort.trim().length === 0)) {
      throw new TypeError('思考强度必须是非空模型能力标识，或为空。');
    }
    settings.compactModel = Object.freeze({
      provider: model.provider,
      model: model.model,
      reasoningEffort: effort,
    });
  }
  return Object.freeze(settings);
}

// 精确目标覆盖沿用原生优先级；保留预算的两种表达互斥。
export function targetPolicy(config, target) {
  const override = config.modelPolicies.find((entry) =>
    entry.provider === target.provider && entry.model === target.model);
  const policy = { ...config, ...override };
  if (override?.retainTokens !== undefined) delete policy.retainRatio;
  else if (override?.retainRatio !== undefined) delete policy.retainTokens;
  return policy;
}

export function configuredThreshold(settings, policy, window, outputTokens) {
  if (settings.thresholdMode === 'absolute') {
    const tokens = settings.thresholdTokens;
    return tokens !== null && tokens < window ? { kind: 'absolute', tokens } : null;
  }
  if (settings.thresholdPercent === null) return null;
  return {
    kind: 'percentage',
    tokens: Math.floor(Math.min(
      window * settings.thresholdPercent / 100,
      window - outputTokens - policy.headroomTokens,
    )),
  };
}

export function retainedBudget(policy, window, outputTokens, threshold) {
  const native = policy.retainTokens ?? Math.floor((window - outputTokens) * policy.retainRatio);
  return native >= threshold ? Math.floor(threshold / 2) : Math.max(0, native);
}

export function operationConfig(native, settings, model) {
  const fields = {
    summarizationProvider: model.provider,
    summarizationModel: model.model,
  };
  if (settings.thresholdMode === 'percentage' && settings.thresholdPercent !== null) {
    fields.thresholdRatio = settings.thresholdPercent / 100;
  }
  return {
    ...native,
    ...fields,
    modelPolicies: native.modelPolicies.map((policy) => ({ ...policy, ...fields })),
  };
}

export function setTargetRetention(config, target, tokens) {
  const policies = config.modelPolicies.map((policy) => ({ ...policy }));
  let override = policies.find((policy) =>
    policy.provider === target.provider && policy.model === target.model);
  if (override === undefined) {
    override = { provider: target.provider, model: target.model };
    policies.push(override);
  }
  delete override.retainRatio;
  override.retainTokens = tokens;
  return { ...config, modelPolicies: policies };
}
