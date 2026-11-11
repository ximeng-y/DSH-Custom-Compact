# 项目简介

本项目是独立的本地压缩插件，为当前 profile 的所有会话共享压缩模型、思考强度和自动阈值设置。会话上栏提供配置标签；`/compact` 与自动压缩使用配置模型，`/defcompact` 强制使用当前会话主模型。

## 结构

[Host 入口](<index.js>)声明 volatile 配置并装配各模块。[阈值策略](<core/policy.js>)负责快照及预算；[原生适配器](<host/native-adapter.js>)在实例上包装压缩入口，保留原生摘要、压缩事务、锁和持久化。具体后端的 `compactPressure` 是模型切换与绝对阈值所需的集中适配点。

[生命周期模块](<host/lifecycle.js>)接入已有和新建会话，[命令模块](<host/commands.js>)提供主模型压缩，[设置模块](<host/settings.js>)连接宿主设置写入、设置工具和状态查询。[Client 入口](<client.js>)使用宿主 React、主题及配置表单实现中英文界面。

[包清单](<package.json>)和[bundle patch](<cordis.patch.yml>)定义本地安装入口；[README](<README.md>)介绍安装、阈值语义与兼容限制。运行源码无需单独构建，宿主依赖由 peer 依赖复用。
