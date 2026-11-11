window.__ModuleLoader__.load({
  id: '@local/dsh-custom-compact',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'custom-compact';
    const dictionaries = {
      zh: {
        title: 'DSH-Custom-Compact', shared: '当前 profile 内所有会话共享此设置。',
        model: '压缩模型', main: '使用当前会话主模型', effort: '思考强度', auto: '默认 / 自动',
        mainEffort: '使用主模型时沿用其显式思考强度，否则使用适配器默认值。',
        noEffort: '该模型没有可选择的思考强度。', missingModel: '已配置，但当前目录不可用',
        missingEffort: '已配置的强度不再受支持', threshold: '自动压缩阈值',
        percentage: '百分比', absolute: '绝对 tokens', percent: '阈值百分比（%）', tokens: 'Token 阈值',
        default: '留空使用原生策略',
        percentHelp: '百分比使用原生 thresholdRatio：floor(min(W × 百分比 / 100, W − 输出预留 − 安全余量))。',
        absoluteHelp: 'T 为空或 T ≥ 主模型窗口 W 时使用原生策略；0 < T < W 时严格使用 T，不额外压低。',
        retention: '过低阈值可能低于不可压缩开销；必要时缩小近期保留预算，但不会拆开工具调用与结果。',
        commands: '/compact 和自动压缩使用上述模型；/defcompact 强制使用当前会话主模型。',
        save: '保存', cancel: '取消修改', refresh: '刷新目录与状态', reload: '重新读取并放弃草稿',
        loading: '正在读取共享设置…', unavailable: '当前 profile 没有提供可用的插件设置表单。',
        readOnly: '当前连接只有读取权限。', saving: '正在保存…', saved: '已保存，之后开始的压缩会使用新设置。',
        conflict: '设置已被其他窗口修改，草稿已保留。请重新读取后再编辑。',
        refused: '宿主未接受保存，草稿已保留。请检查权限、配置或重新读取设置。',
        percentError: '百分比必须大于 0 且不超过 100，或留空。',
        tokensError: 'Token 阈值必须是正的安全整数，或留空。',
        effortError: '所选模型不支持该思考强度，请选择受支持的值或默认。',
        readError: '读取设置失败', catalogError: '读取模型目录失败', catalogLoading: '正在读取模型目录…',
        runtimeLoading: '正在读取后端状态…', runtimeError: '后端状态读取失败',
        active: '当前会话的原生压缩后端已接入。', unsupported: '当前会话未应用自定义压缩设置',
        autoOff: '原生后端关闭了自动压缩；手动压缩仍可使用这些设置。',
      },
      en: {
        title: 'DSH-Custom-Compact', shared: 'These settings are shared by every session in the current profile.',
        model: 'Compaction model', main: 'Use the current conversation model', effort: 'Reasoning effort', auto: 'Default / Auto',
        mainEffort: 'The conversation model keeps its explicit effort, or uses the adapter default.',
        noEffort: 'This model has no selectable reasoning effort.', missingModel: 'Configured, but unavailable in the catalog',
        missingEffort: 'Configured effort is no longer supported', threshold: 'Automatic compaction threshold',
        percentage: 'Percentage', absolute: 'Absolute tokens', percent: 'Threshold percentage (%)', tokens: 'Token threshold',
        default: 'Leave blank for the native policy',
        percentHelp: 'Percentage uses native thresholdRatio: floor(min(W × percentage / 100, W − output reservation − safety headroom)).',
        absoluteHelp: 'Blank T or T ≥ the conversation model window W uses the native policy; 0 < T < W uses exactly T without extra clamping.',
        retention: 'Very low thresholds may be below irreducible overhead. Recent retention is reduced when necessary, without splitting tool calls and results.',
        commands: '/compact and automatic compaction use this model; /defcompact forces the current conversation model.',
        save: 'Save', cancel: 'Cancel changes', refresh: 'Refresh catalog and status', reload: 'Reload and discard draft',
        loading: 'Loading shared settings…', unavailable: 'This profile has no available configuration form for this plugin.',
        readOnly: 'This connection is read-only.', saving: 'Saving…', saved: 'Saved. Compaction started afterwards will use the new settings.',
        conflict: 'Another editor changed these settings. Your draft is preserved; reload before editing again.',
        refused: 'The Host refused the save. Your draft is preserved; check permissions or configuration, or reload.',
        percentError: 'Enter a percentage greater than 0 and at most 100, or leave it blank.',
        tokensError: 'Enter a positive safe integer token threshold, or leave it blank.',
        effortError: 'This model does not support the chosen effort. Choose a supported value or Auto.',
        readError: 'Could not read settings', catalogError: 'Could not read the model catalog', catalogLoading: 'Loading the model catalog…',
        runtimeLoading: 'Reading backend status…', runtimeError: 'Could not read backend status',
        active: 'The native compaction backend is connected for this session.', unsupported: 'Custom compaction settings are not applied to this session',
        autoOff: 'Native automatic compaction is disabled; manual compaction can still use these settings.',
      },
    };
    const CSS = `
      .cc-pane{height:100%;overflow:auto;box-sizing:border-box;padding:24px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font-size:14px;line-height:1.6}
      .cc-content{max-width:840px;margin:0 auto}.cc-pane h2{font-size:20px;line-height:1.4;margin:0 0 8px}.cc-muted{color:var(--dsw-alias-label-secondary)}
      .cc-box{min-width:0;margin:20px 0;padding:18px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
      .cc-box legend{font-weight:600;padding:0 6px}.cc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
      .cc-field{display:flex;flex-direction:column;gap:8px;min-width:0}.cc-field label{font-weight:500}.cc-pane select,.cc-pane input[type=text]{width:100%;box-sizing:border-box;min-height:40px;padding:8px 12px;font:inherit;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px}
      .cc-pane select:focus-visible,.cc-pane input:focus-visible,.cc-pane button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
      .cc-pane :disabled{opacity:.55;cursor:not-allowed}.cc-modes{display:flex;flex-wrap:wrap;gap:20px;margin:0 0 18px}.cc-modes label{display:flex;gap:8px;align-items:center}.cc-modes input{accent-color:var(--dsw-alias-brand-primary)}
      .cc-actions{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}.cc-pane button{min-height:38px;padding:7px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;font:inherit;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);cursor:pointer}.cc-pane button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
      .cc-pane .cc-save{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);font-weight:600}.cc-error{color:var(--dsw-alias-state-error-primary)}.cc-ok{color:var(--dsw-alias-state-success-primary)}.cc-warn{color:var(--dsw-alias-state-warn-primary)}.cc-notice{overflow-wrap:anywhere;margin:12px 0}
      @media(max-width:560px){.cc-pane{padding:16px}.cc-grid{grid-template-columns:1fr}.cc-box{padding:14px}}
    `;

    function useSnapshot(source) {
      return React.useSyncExternalStore(
        React.useCallback((listener) => source.subscribe(listener), [source]),
        React.useCallback(() => source.getSnapshot(), [source]),
      );
    }
    function draftOf(value) {
      const settings = value?.settings ?? {};
      return {
        thresholdMode: settings.thresholdMode ?? 'percentage',
        thresholdPercent: settings.thresholdPercent == null ? '' : String(settings.thresholdPercent),
        thresholdTokens: settings.thresholdTokens == null ? '' : String(settings.thresholdTokens),
        compactModel: settings.compactModel == null ? null : { ...settings.compactModel },
      };
    }
    const modelKey = (model) => model ? JSON.stringify([model.provider, model.model]) : '';
    const errorText = (error) => error instanceof Error ? error.message : String(error);

    function SettingsPane({ ctx, sessionId }) {
      useSnapshot(ctx.locale);
      const t = ctx.locale.bind(NS);
      const form = React.useMemo(() => ctx.configForms.get(NS), [ctx]);
      const mirror = React.useMemo(() => ctx.configForms.describe(), [ctx]);
      const snapshot = useSnapshot(form);
      const described = useSnapshot(mirror);
      const [editor, setEditor] = React.useState(null);
      const [dirty, setDirty] = React.useState(false);
      const [saving, setSaving] = React.useState(false);
      const [notice, setNotice] = React.useState(null);
      const [catalog, setCatalog] = React.useState({ loading: true, groups: [], failures: [], error: null });
      const [runtime, setRuntime] = React.useState({ state: 'loading' });
      const [refresh, setRefresh] = React.useState(0);
      const alive = React.useRef(true);
      const prefix = React.useId();
      React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
      React.useEffect(() => {
        if (snapshot.status === 'ready' && !dirty && !saving) {
          setEditor({ value: draftOf(snapshot.value), revision: snapshot.revision });
        }
      }, [snapshot.value, snapshot.revision, snapshot.status, dirty, saving]);
      React.useEffect(() => {
        let current = true;
        setCatalog((previous) => ({ ...previous, loading: true, error: null }));
        ctx.remote.session.modelCatalog().then((result) => {
          if (!current) return;
          if (!result.ok) {
            setCatalog((previous) => ({ ...previous, loading: false, error: result.error.message }));
            return;
          }
          setCatalog({ loading: false, groups: result.value.groups, failures: result.value.failures, error: null });
        }, (error) => {
          if (current) setCatalog((previous) => ({ ...previous, loading: false, error: errorText(error) }));
        });
        return () => { current = false; };
      }, [ctx, refresh]);
      React.useEffect(() => {
        const abort = new AbortController();
        setRuntime({ state: 'loading' });
        // 本地只读接口没有编译后的 Remote 客户端描述符，使用公开 Connection RPC。
        ctx.connection.rpc.call('/api', 'customCompact/status', { args: { sessionId } }, abort.signal).then((result) => {
          if (abort.signal.aborted) return;
          setRuntime(result.ok ? result.value : { state: 'error', reason: result.error.message });
        }, (error) => {
          if (!abort.signal.aborted) setRuntime({ state: 'error', reason: errorText(error) });
        });
        return () => abort.abort();
      }, [ctx, sessionId, refresh, snapshot.revision]);

      const editable = snapshot.status === 'ready' && snapshot.writable && !saving;
      const change = (update) => {
        setEditor((previous) => ({ ...previous, value: update(previous.value) }));
        setDirty(true);
        setNotice(null);
      };
      const reset = () => {
        const latest = form.getSnapshot();
        if (latest.status !== 'ready') return;
        setEditor({ value: draftOf(latest.value), revision: latest.revision });
        setDirty(false);
        setNotice(null);
      };
      const discardAndReload = async () => {
        await mirror.load();
        if (alive.current) reset();
      };
      const save = async (event) => {
        event.preventDefault();
        if (!editable || !dirty || !editor) return;
        const draft = editor.value;
        const thresholdPercent = draft.thresholdPercent.trim() === '' ? null : Number(draft.thresholdPercent);
        const thresholdTokens = draft.thresholdTokens.trim() === '' ? null : Number(draft.thresholdTokens);
        if (thresholdPercent !== null && (!Number.isFinite(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent > 100)) {
          setNotice({ error: true, text: t('percentError') }); return;
        }
        if (thresholdTokens !== null && (!Number.isSafeInteger(thresholdTokens) || thresholdTokens <= 0)) {
          setNotice({ error: true, text: t('tokensError') }); return;
        }
        const compactModel = draft.compactModel;
        const listed = compactModel && catalog.groups.find((group) => group.id === compactModel.provider)?.models.find((model) => model.id === compactModel.model);
        if (listed && compactModel.reasoningEffort != null && !listed.reasoning?.efforts.some((effort) => effort.id === compactModel.reasoningEffort)) {
          setNotice({ error: true, text: t('effortError') }); return;
        }
        if (form.getSnapshot().revision !== editor.revision) {
          setNotice({ error: true, text: t('conflict') }); return;
        }
        setSaving(true);
        setNotice(null);
        try {
          const accepted = await form.mutate([{
            op: 'set', path: ['settings'],
            value: { thresholdMode: draft.thresholdMode, thresholdPercent, thresholdTokens, compactModel },
          }], editor.revision);
          if (!alive.current) return;
          if (accepted) {
            reset();
            setNotice({ error: false, text: t('saved') });
          } else {
            setNotice({ error: true, text: t(form.getSnapshot().revision !== editor.revision ? 'conflict' : 'refused') });
          }
        } catch (error) {
          if (alive.current) setNotice({ error: true, text: `${t('refused')} ${errorText(error)}` });
        } finally {
          if (alive.current) setSaving(false);
        }
      };

      const draft = editor?.value;
      const selected = draft?.compactModel;
      const selectedGroup = catalog.groups.find((group) => group.id === selected?.provider);
      const selectedModel = selectedGroup?.models.find((model) => model.id === selected?.model);
      const efforts = selectedModel?.reasoning?.efforts ?? [];
      const selectedEffort = selected?.reasoningEffort ?? '';
      const badEffort = selectedEffort !== '' && !efforts.some((effort) => effort.id === selectedEffort);
      const selectModel = (event) => {
        const key = event.target.value;
        if (!key) { change((value) => ({ ...value, compactModel: null })); return; }
        const [provider, model] = JSON.parse(key);
        const entry = catalog.groups.find((group) => group.id === provider)?.models.find((item) => item.id === model);
        const previous = draft.compactModel?.reasoningEffort;
        const supported = entry?.reasoning?.efforts.some((effort) => effort.id === previous);
        change((value) => ({ ...value, compactModel: { provider, model, reasoningEffort: supported ? previous : null } }));
      };
      const field = (key, label, control) => h('div', { className: 'cc-field' }, h('label', { htmlFor: `${prefix}-${key}` }, label), control);
      const alert = (text, className = 'cc-error') => h('p', { className: `cc-notice ${className}`, role: 'alert' }, text);
      let backend;
      if (runtime.state === 'loading') backend = h('p', { className: 'cc-muted', role: 'status' }, t('runtimeLoading'));
      else if (runtime.state === 'error') backend = alert(`${t('runtimeError')}: ${runtime.reason}`);
      else if (runtime.state === 'active') backend = h(React.Fragment, null,
        h('p', { className: 'cc-ok' }, t('active')),
        runtime.automatic === false ? alert(t('autoOff'), 'cc-warn') : null);
      else backend = alert(`${t('unsupported')}: ${runtime.reason ?? ''}`, 'cc-warn');

      return h('section', { className: 'cc-pane', 'aria-label': t('title') },
        h('style', null, CSS),
        h('div', { className: 'cc-content' },
          h('h2', null, t('title')), h('p', { className: 'cc-muted' }, t('shared')), backend,
          described.error ? alert(`${t('readError')}: ${described.error}`) : null,
          snapshot.status === 'unavailable' ? alert(t('unavailable')) : null,
          snapshot.status !== 'ready' && snapshot.status !== 'unavailable' ? h('p', { role: 'status' }, t('loading')) : null,
          snapshot.status === 'ready' && !snapshot.writable ? alert(t('readOnly'), 'cc-warn') : null,
          catalog.error ? alert(`${t('catalogError')}: ${catalog.error}`) : null,
          ...catalog.failures.map((failure) => alert(`${failure.name}: ${failure.message}`, 'cc-warn')),
          draft ? h('form', { onSubmit: save, 'aria-busy': saving },
            h('fieldset', { className: 'cc-box' }, h('legend', null, t('model')),
              h('div', { className: 'cc-grid' },
                field('model', t('model'), h('select', { id: `${prefix}-model`, value: modelKey(selected), onChange: selectModel, disabled: !editable || catalog.loading },
                  h('option', { value: '' }, t('main')),
                  selected && !selectedModel ? h('option', { value: modelKey(selected) }, `${selected.provider}/${selected.model} — ${t('missingModel')}`) : null,
                  ...catalog.groups.map((group) => h('optgroup', { key: group.id, label: group.name },
                    ...group.models.map((model) => h('option', { key: model.id, value: modelKey({ provider: group.id, model: model.id }) }, model.name))))),
                ),
                field('effort', t('effort'), h('select', {
                  id: `${prefix}-effort`, value: selectedEffort,
                  disabled: !editable || !selected || catalog.loading || (efforts.length === 0 && !badEffort),
                  onChange: (event) => change((value) => ({ ...value, compactModel: { ...value.compactModel, reasoningEffort: event.target.value || null } })),
                }, h('option', { value: '' }, t('auto')),
                badEffort ? h('option', { value: selectedEffort, disabled: true }, `${selectedEffort} — ${t('missingEffort')}`) : null,
                ...efforts.map((effort) => h('option', { key: effort.id, value: effort.id }, effort.name)))),
              ),
              h('p', { className: 'cc-muted' }, selected ? (efforts.length === 0 ? t('noEffort') : '') : t('mainEffort')),
              catalog.loading ? h('p', { className: 'cc-muted', role: 'status' }, t('catalogLoading')) : null,
            ),
            h('fieldset', { className: 'cc-box' }, h('legend', null, t('threshold')),
              h('div', { className: 'cc-modes' }, ...['percentage', 'absolute'].map((mode) => h('label', { key: mode },
                h('input', { type: 'radio', name: `${prefix}-mode`, value: mode, checked: draft.thresholdMode === mode, disabled: !editable,
                  onChange: () => change((value) => ({ ...value, thresholdMode: mode })) }), t(mode)))),
              h('div', { className: 'cc-grid' },
                field('percent', t('percent'), h('input', { id: `${prefix}-percent`, type: 'text', inputMode: 'decimal', value: draft.thresholdPercent, placeholder: t('default'),
                  disabled: !editable || draft.thresholdMode !== 'percentage', onChange: (event) => change((value) => ({ ...value, thresholdPercent: event.target.value })) })),
                field('tokens', t('tokens'), h('input', { id: `${prefix}-tokens`, type: 'text', inputMode: 'numeric', value: draft.thresholdTokens, placeholder: t('default'),
                  disabled: !editable || draft.thresholdMode !== 'absolute', onChange: (event) => change((value) => ({ ...value, thresholdTokens: event.target.value })) })),
              ),
              h('p', { className: 'cc-muted' }, t(draft.thresholdMode === 'percentage' ? 'percentHelp' : 'absoluteHelp')),
              h('p', { className: 'cc-muted' }, t('retention')),
            ),
            h('p', { className: 'cc-muted' }, t('commands')),
            notice ? h('p', { className: `cc-notice ${notice.error ? 'cc-error' : 'cc-ok'}`, role: notice.error ? 'alert' : 'status' }, notice.text) : null,
            h('div', { className: 'cc-actions' },
              h('button', { type: 'submit', className: 'cc-save', disabled: !editable || !dirty }, t(saving ? 'saving' : 'save')),
              h('button', { type: 'button', disabled: saving || !dirty, onClick: reset }, t('cancel')),
              h('button', { type: 'button', disabled: saving, onClick: discardAndReload }, t('reload')),
            ),
          ) : null,
          h('div', { className: 'cc-actions' }, h('button', { type: 'button', disabled: saving || catalog.loading,
            onClick: () => { setRefresh((value) => value + 1); mirror.load(); } }, t('refresh'))),
        ),
      );
    }

    return {
      inject: ['slots', 'locale', 'configForms', 'remote', 'remote.session', 'connection'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dictionaries));
        ctx.effect(() => ctx.configForms.whileServed([NS], () =>
          ctx.slots.inject('conversation.view', () => ctx.slots.register({
            name: 'conversation.view', id: NS, order: 50, label: () => ctx.locale.bind(NS)('title'),
          }, (props) => h(SettingsPane, { ...props, ctx }))),
        ));
      },
    };
  },
});
