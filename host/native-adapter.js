import { symbols, withProps } from '@deepseek-ai/cordis';
import { BasicCompactionEngine } from '@deepseek-ai/dsh-compaction-basic';
import { ManualCompactionError, toolPairingBalancedBefore } from '@deepseek-ai/dsh-compaction';
import {
  configuredThreshold, operationConfig, retainedBudget,
  setTargetRetention, targetPolicy,
} from '../core/policy.js';

const ENTRIES = ['compactIfNeeded', 'compactNow', 'compactPressure'];
const rawService = (service) => service?.[symbols.original] ?? service;

function incompatibility(engine) {
  if (!(engine instanceof BasicCompactionEngine)) return '当前会话不是原生 BasicCompactionEngine 后端。';
  const prototype = BasicCompactionEngine.prototype;
  for (const method of [...ENTRIES, 'compactRegion', 'summarize']) {
    if (typeof engine[method] !== 'function' || engine[method] !== prototype[method]) {
      return `原生 ${method} 已被替换或不兼容，未安装部分适配。`;
    }
  }
  if (!engine.config || !Array.isArray(engine.config.modelPolicies) || !engine.ctx?.llm) {
    return '原生后端配置或上下文结构不兼容。';
  }
  if (!Object.isExtensible(engine)) return '原生后端实例不可扩展。';
  for (const method of ENTRIES) {
    const descriptor = Object.getOwnPropertyDescriptor(engine, method);
    if (descriptor && !descriptor.configurable && !descriptor.writable) {
      return `原生 ${method} 不允许实例局部适配。`;
    }
  }
  return null;
}

// 只实现原生未公开的绝对压力选择；实际替换始终交给 compactRegion。
function oldestBalancedRange(session, measurement, retainTokens) {
  const nodes = session.surface.nodes;
  const priced = measurement.nodes;
  if (nodes.length === 0) return null;
  if (nodes.length !== priced.length || nodes.some((seq, i) => seq !== priced[i].seq)) {
    throw new Error('压缩测量与当前历史表面不一致。');
  }
  const first = session.eventAt(nodes[0]).type === 'system/message' ? 1 : 0;
  let keepFrom = priced.length;
  let retained = 0;
  for (let i = priced.length - 1; i >= 0; i -= 1) {
    retained += priced[i].tokens;
    keepFrom = i;
    if (retained >= retainTokens) break;
  }
  while (keepFrom > first && !toolPairingBalancedBefore(session, nodes[keepFrom])) {
    keepFrom -= 1;
  }
  if (keepFrom <= first) return null;
  return { start: nodes[first], end: nodes[keepFrom - 1] };
}

async function strictPressure(view, agent, header, signal, requireBelow, threshold, retain) {
  const meter = view.ctx.tokenMeter;
  let measured = meter.measure(agent.session, header);
  if (measured.totalTokens < threshold) return null;
  view.ctx.get('toolResultPruner')?.pruneSession(agent.session);
  measured = meter.measure(agent.session, header);
  if (measured.totalTokens < threshold) return null;
  const policy = targetPolicy(view.config, header.config);
  let result = null;
  for (let attempt = 0; attempt <= policy.compactionRetries; attempt += 1) {
    signal.throwIfAborted();
    const range = oldestBalancedRange(agent.session, measured, retain);
    if (range === null) {
      if (result === null && !requireBelow) return null;
      throw new Error(`没有安全历史范围能降到绝对阈值以下（${measured.totalTokens} >= ${threshold} tokens）。`);
    }
    result = await view.compactRegion(range.start, range.end, agent, signal);
    measured = meter.measure(agent.session, header);
    if (measured.totalTokens < threshold) return result;
  }
  throw new Error(`压缩 ${policy.compactionRetries + 1} 次后仍达到绝对阈值（${measured.totalTokens} >= ${threshold} tokens）。`);
}

function callView(record, receiver, settings, model) {
  const context = receiver.ctx;
  const llm = context.llm;
  const state = { config: operationConfig(record.engine.config, settings, model) };
  const callContext = withProps(context, {
    llm: withProps(llm, {
      stream(options) {
        if (options.purpose !== 'compaction' || options.provider !== model.provider || options.model !== model.model) {
          return llm.stream(options);
        }
        const request = { ...options };
        if (model.reasoningEffort != null) request.reasoningEffort = model.reasoningEffort;
        else delete request.reasoningEffort;
        return llm.stream(request);
      },
    }),
  });
  let view;
  const props = {
    get config() { return state.config; },
    ctx: callContext,
    compactIfNeeded: record.original.compactIfNeeded,
    compactNow: record.original.compactNow,
    compactRegion: record.original.compactRegion,
    summarize: record.original.summarize,
    async compactPressure(agent, header, signal, requireBelow) {
      if ((settings.thresholdMode === 'absolute' && settings.thresholdTokens === null) ||
          (settings.thresholdMode === 'percentage' && settings.thresholdPercent === null)) {
        return record.original.compactPressure.call(view, agent, header, signal, requireBelow);
      }
      signal.throwIfAborted();
      const target = header.config;
      const info = await llm.resolveModelInfo(target.provider, target.model, signal);
      const window = info.context?.contextWindow;
      if (!Number.isSafeInteger(window) || window <= 0) {
        return record.original.compactPressure.call(view, agent, header, signal, requireBelow);
      }
      const policy = targetPolicy(state.config, target);
      const output = header.config.maxTokens ?? info.defaultMaxTokens ?? 0;
      const threshold = configuredThreshold(settings, policy, window, output);
      if (threshold === null) {
        return record.original.compactPressure.call(view, agent, header, signal, requireBelow);
      }
      const retain = retainedBudget(policy, window, output, threshold.tokens);
      if (threshold.kind === 'absolute') {
        return strictPressure(view, agent, header, signal, requireBelow, threshold.tokens, retain);
      }
      // 百分比仍走原生安全余量策略，仅修正过大的近期保留预算。
      if (threshold.tokens > 0) state.config = setTargetRetention(state.config, target, retain);
      return record.original.compactPressure.call(view, agent, header, signal, requireBelow);
    },
  };
  view = withProps(record.engine, props);
  return view;
}

export function createNativeAdapter(ctx, getSettings) {
  const records = new Map();
  const active = new Set();
  const activeAgents = new WeakSet();
  const shutdown = new AbortController();
  let disposed = false;

  function engineFor(agent) {
    const presets = ctx.get('agentPresets');
    const service = presets?.serviceFor(agent, 'compaction') ?? agent.ctx.get('compaction');
    return rawService(service);
  }

  function restore(record) {
    if (!record.attached) return;
    record.attached = false;
    for (const method of ENTRIES) {
      if (record.engine[method] !== record.wrappers[method]) continue;
      const previous = record.descriptors[method];
      if (previous) Object.defineProperty(record.engine, method, previous);
      else delete record.engine[method];
    }
    records.delete(record.engine);
    record.releaseOwner?.();
  }

  function run(record, receiver, method, args, forceMain = false) {
    if (disposed) throw new ManualCompactionError('cancelled', '压缩插件已卸载。');
    const agent = args[0];
    if (activeAgents.has(agent)) throw new ManualCompactionError('busy', '当前会话已有压缩操作。');
    const settings = getSettings();
    const main = agent.model.current();
    const model = (!forceMain && settings.compactModel) || main;
    if (!model?.provider || !model?.model) throw new Error('当前会话未选择可用的主模型。');
    const view = callView(record, receiver, settings, { ...model });
    const forwarded = [...args];
    const signalIndex = method === 'compactPressure' ? 2 : 1 + (method === 'compactIfNeeded' ? 1 : 0);
    const inputSignal = forwarded[signalIndex];
    forwarded[signalIndex] = inputSignal
      ? AbortSignal.any([inputSignal, shutdown.signal]) : shutdown.signal;
    activeAgents.add(agent);
    let operation;
    try {
      // 不先 await：原生 compactNow 同步预约维护任务，避免排队工作穿过压缩锁。
      const entry = method === 'compactPressure' ? view.compactPressure : record.original[method];
      operation = Promise.resolve(entry.apply(view, forwarded));
    } catch (error) {
      activeAgents.delete(agent);
      throw error;
    }
    active.add(operation);
    const retire = () => { active.delete(operation); activeAgents.delete(agent); };
    operation.then(retire, retire);
    return operation;
  }

  function ensure(agent) {
    if (disposed) return null;
    const engine = engineFor(agent);
    if (engine === undefined) return null;
    const existing = records.get(engine);
    if (existing) {
      if (ENTRIES.every((key) => engine[key] === existing.wrappers[key]) &&
          engine.summarize === existing.original.summarize &&
          engine.compactRegion === existing.original.compactRegion) return existing;
      restore(existing);
      return null;
    }
    const reason = incompatibility(engine);
    if (reason !== null) return null;
    const record = {
      engine, attached: true, descriptors: {}, wrappers: {}, original: {},
    };
    for (const method of [...ENTRIES, 'compactRegion', 'summarize']) record.original[method] = engine[method];
    for (const method of ENTRIES) {
      record.descriptors[method] = Object.getOwnPropertyDescriptor(engine, method);
      record.wrappers[method] = function(...args) { return run(record, this, method, args); };
    }
    try {
      for (const method of ENTRIES) {
        Object.defineProperty(engine, method, {
          ...record.descriptors[method],
          value: record.wrappers[method],
          ...record.descriptors[method] ? {} : { configurable: true, writable: true, enumerable: false },
        });
      }
      records.set(engine, record);
      // 原生后端退役和本插件卸载都能清理，旧预设实例不会一直被强引用。
      record.releaseOwner = engine.ctx.effect(() => () => restore(record));
      return record;
    } catch (error) {
      restore(record);
      ctx.logger.warn(`自定义压缩未启用：${error.message}`);
      return null;
    }
  }

  return {
    ensure,
    status(agent) {
      if (!agent) return { state: 'unavailable', reason: '会话未加载。', automatic: null };
      const engine = engineFor(agent);
      if (engine === undefined) return { state: 'unavailable', reason: '当前会话没有压缩后端。', automatic: null };
      const record = records.get(engine);
      if (record && ENTRIES.every((key) => engine[key] === record.wrappers[key])) {
        return { state: 'active', reason: null, automatic: engine.config.auto };
      }
      return {
        state: 'unsupported',
        reason: incompatibility(engine) ?? '当前后端尚未接入或适配已被其他插件替换。',
        automatic: typeof engine.config?.auto === 'boolean' ? engine.config.auto : null,
      };
    },
    compactMain(agent, signal, commandId) {
      const record = ensure(agent);
      if (!record) throw new Error(this.status(agent).reason ?? '当前后端不支持主模型压缩。');
      return run(record, record.engine, 'compactNow', [agent, signal, commandId], true);
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      shutdown.abort(new ManualCompactionError('cancelled', '压缩插件已卸载。'));
      for (const record of [...records.values()]) restore(record);
      await Promise.allSettled([...active]);
    },
  };
}
