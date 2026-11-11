export function registerLifecycle(ctx, adapter) {
  const discover = (agent) => {
    try { adapter.ensure(agent); }
    catch (error) { ctx.logger.warn(`自定义压缩后端未接入：${error.message}`); }
  };
  ctx.on('agent/created', ({ agent }) => { discover(agent); });
  ctx.on('agent-preset/selected', (sessionId) => {
    const agent = ctx.agents.get(sessionId);
    if (agent) discover(agent);
  });
  ctx.on('agent/pre-step', ({ agent }, next) => {
    discover(agent);
    return next();
  }, { prepend: true });
  for (const agent of ctx.agents.list()) discover(agent);
}
