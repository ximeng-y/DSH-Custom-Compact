import { ManualCompactionError } from '@deepseek-ai/dsh-compaction';

const FAILURES = {
  busy: '当前会话正在运行、等待工作，或已有压缩操作，请空闲后重试。',
  cancelled: '压缩已取消。',
  changed: '选中的历史在摘要期间发生变化，未按旧范围替换。',
  summary: '摘要生成失败或没有缩小上下文，失败尝试已记录。',
  commit: '压缩未完整提交，历史可能已变化；请先检查会话。',
  persistence: '压缩已完成，但会话持久化失败。',
};

export function registerCommands(ctx, adapter) {
  const active = new Set();
  const execute = async (invocation) => {
    if (invocation.rawInput.trim()) return { kind: 'error', text: '用法：/defcompact（无参数）' };
    try {
      const result = await adapter.compactMain(invocation.agent, invocation.signal, invocation.commandId);
      if (result === null) return { kind: 'success', text: '尚无可安全压缩的历史。' };
      return {
        kind: 'success',
        text: `使用会话主模型压缩了 ${result.shadowedSeqs.length} 条历史（约 ${result.shadowedTokenCount} tokens）。`,
        sourceEventSeq: result.summarySeq,
      };
    } catch (error) {
      if (invocation.signal.aborted) return { kind: 'error', text: FAILURES.cancelled };
      if (error instanceof ManualCompactionError) {
        return { kind: 'error', text: FAILURES[error.code] ?? error.message };
      }
      return { kind: 'error', text: error instanceof Error ? error.message : String(error) };
    }
  };
  ctx.effect(function* () {
    yield async () => { await Promise.allSettled([...active]); };
    yield ctx.commands.register({
      definitionId: '@local/dsh-custom-compact/defcompact',
      name: 'defcompact',
      description: '使用当前会话主模型压缩较早历史',
      handler(invocation) {
        const operation = execute(invocation);
        active.add(operation);
        const retire = () => active.delete(operation);
        operation.then(retire, retire);
        return operation;
      },
    });
  }, '主模型压缩命令');
}
