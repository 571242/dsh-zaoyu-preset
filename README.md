# 早鱼 · dsh-zaoyu-preset

[DSH](https://github.com/deepseek-ai)（DeepSeek Harness）的**项目工作台指挥官**预设。固定精简底座，9 组重型扩展按阶段展开，与「破甲开关」并行、互不覆盖。

早鱼的人设是住在数据海洋里的首席技术指挥：先抓架构与核心链路，主动砍掉过度设计，硬核落地、交付可核验的成品，个性互动只留在正文之外。

## 定位

- 日常问答直接回答。只有当当前工作目录初始化过 `.studio/state.json` 时，才惰性注入 `zaoyu:director` 工作台纪律：读取项目的 `.agents/skills/project-director/SKILL.md` 与 `.studio/BRIEF.md`，用 `.studio/studio.mjs` 的 `resume / config / dispatch` 沿用进度、路由和验收契约。
- 主控负责需求、规划、派工、验收与交接，不读改业务源码、不跑项目构建或测试。
- 子代理保留完整工具集，不被折叠、不被注入本纪律。

## 安装

预设是一个 DSH bundle（`package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`）。把它加进当前 profile 即可：

- Web 界面：**插件 / Plugins** → **Add plugin / 添加插件** → 选择本目录（或发布包目录）。
- 或用 `plugin_manager` 的 `install_bundle`，`target` 传本包的绝对路径；也可以在该 profile 的 `package.json` 里用 `"@local/dsh-zaoyu-preset": "link:<本目录>"` 依赖，并把 `@local/dsh-zaoyu-preset` 加进 `dsh.profile.bundles`。
- 安装后在新建会话的预设下拉里选择「早鱼」。

要求 DSH `>= 0.2.2-rc.3`。

## 协调与扩展工具（已知扩展折叠制）

- **默认可见**：所有基础工具，以及未命中 9 个折叠组的工具（如 `apply_patch`、新装小工具、核心记忆检索、`subagent` / `subagent_fork` / `send_message` / `list_agents` / `interrupt_agent` / `wait_agent` / `list_subagent_models`）直接可用。
- **9 组按需折叠**：`search`（检索）、`browser`（浏览器）、`memory`（记忆管理）、`agents`（专家/团队/工作流）、`images`（图片）、`office`（Office）、`schedule`（定时）、`ui`（结构化 UI）、`admin`（插件管理）通过 `zaoyu_tools` 按组展开。
- **`zaoyu_tools` 自省**：`groups: []` 只读不改工具，并在 `groups.<key>.tools` 返回该组包含的具体工具名；组启用后在本会话保留，只有显式 `reset: true` 才复位。

## 与破甲开关协作

- 不覆盖 `armor-switch:contract`、`armor-switch:preferences`、`armor-switch:authority`、`armor-switch:mechanism` 四段。动态破甲开关完全交给 [`dsh-armor-switch`](https://github.com/571242/dsh-armor-switch) 控制，本预设只做工具折叠与工作台纪律，不碰交付契约。

## 生命周期

- 轻量层在早鱼首轮的 `agent/pre-step` 生效，只作用于根会话；切换预设（进/出早鱼）会实时挂载/卸载 `zaoyu_tools` 与相关注入。

## 自测

`test.mjs` 需要 `yaml` 与 DSH 安装目录，两者都在 profile 里时：

```powershell
$env:DSH_INSTALL_DIR = "$env:DSH_PROFILE_DIR"   # 或指向含 yaml 的目录
node .\test.mjs
```

全部断言通过会输出一行 `{"passed":true,...}`。

## 结构

| 文件 | 作用 |
| --- | --- |
| `runtime.js` | 预设插件本体：按会话挂载/卸载、注册 `zaoyu_tools`、注入工作台纪律 |
| `policy.js` | 工具分组规则、`zaoyu:director` 纪律文本、附加 system prompt 片段 |
| `cordis.patch.yml` | bundle 补丁：插入 `zaoyu` 预设及其全部基础插件行 |
| `locale/` | 中英显示元数据 |
| `icon.svg` | 预设图标 |
| `test.mjs` | 无宿主自检 |

## License

MIT
