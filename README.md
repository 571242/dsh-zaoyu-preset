# 早鱼

项目工作台指挥官预设。固定精简底座，9 组重型扩展按阶段展开，不拦截破甲开关。

## 定位

- 日常问答直接回答；仅当当前工作目录存在 `.studio/state.json` 时，才惰性注入 `zaoyu:director` 工作台纪律，读取 `.agents/skills/project-director/SKILL.md` 与 `.studio/BRIEF.md`，用 `.studio/studio.mjs` 的 `resume / config / dispatch` 沿用工作台进度、路由和验收契约。
- 主控负责需求、规划、派工、验收与交接，不读改业务源码、不跑项目构建或测试。

## 协调与扩展工具（方案 A：已知扩展折叠制）

- **默认可见**：所有基础工具与未命中 9 个折叠组的工具（如 `apply_patch`、新装小工具、核心记忆检索、`subagent`/`subagent_fork`/`send_message`/`list_agents`/`interrupt_agent`/`wait_agent`/`list_subagent_models` 及 Team 任务板）直接可用。
- **9 组按需折叠**：`search`、`browser`、`memory`、`agents`、`images`、`office`、`schedule`、`ui`、`admin` 通过 `zaoyu_tools` 按组展开。
- **`zaoyu_tools` 自省**：`groups: []` 只读不改工具，且在 `groups.<key>.tools` 列出该组工具，并在 `groups.<key>.visible` 区分已可见的工具。注册变更在下一步同步；组启用后在本会话保留，只有明确 `reset: true` 才复位。

## 与破甲开关协作

- 不覆盖 `armor-switch:contract`、`armor-switch:preferences`、`armor-switch:authority`、`armor-switch:mechanism`，动态破甲开关完全由 `dsh-armor-switch` 控制。

## 生命周期

- 轻量层在早鱼首轮 `agent/pre-step` 生效，只作用于根会话（子代理保留完整工具）。
- 自测：`node F:\SPACE\ZaoyuPreset\test.mjs`（需设置 `DSH_INSTALL_DIR` 或使用 DSH 内置运行时）。
