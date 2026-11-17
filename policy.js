export const CORE_EXCEPTIONS = new Set([
  'mnemon_recall', 'mnemon_document_search', 'mnemon_view_route', 'mnemon_view_action',
]);

export const GROUPS = {
  search: '平台、领域、时限检索及天气视频',
  browser: '浏览器操作与调试',
  memory: '记忆写入、空间与文档管理',
  agents: '专家、团队及工作流',
  images: '图片生成与视觉读取',
  office: 'Office 渲染与转换',
  schedule: '定时任务',
  ui: '结构化 UI 与校验',
  admin: '插件管理与工作树',
};

export function groupOf(name) {
  if (name === 'zaoyu_tools' || CORE_EXCEPTIONS.has(name)) return 'core';
  if (/^(bsk_|browser_)/.test(name)) return 'browser';
  if (/^mnemon_/.test(name)) return 'memory';
  if (/^(summon_|list_experts|list_expert_teams|get_expert_team|propose_|open_.*expert|workflow)/.test(name)) return 'agents';
  if (/^(antigravity_image_generate|codex_image_generate|modlens_read_image|read_image)$/.test(name)) return 'images';
  if (/^office_/.test(name)) return 'office';
  if (/^schedule_/.test(name)) return 'schedule';
  if (/^(render_ui|validate_dsh_ui)$/.test(name)) return 'ui';
  if (/^(plugin_manager|create_worktree)$/.test(name)) return 'admin';
  if (/^(advanced_search|multi_search|platform_search|domain_search|video_search|weather|cache_search|free_search_test)$/.test(name)) return 'search';
  return 'core';
}

export function hiddenNames(definitions, active) {
  return definitions.map(tool => tool.name).filter(name => {
    const group = groupOf(name);
    return group !== 'core' && !active.has(group);
  });
}

export const DIRECTOR_SECTION = `【项目工作台】
- 检测到当前工作目录已初始化 .studio：先读取项目的 .agents/skills/project-director/SKILL.md 与 .studio/BRIEF.md，用 .studio/studio.mjs 的 resume、config、dispatch 沿用工作台进度、路由和验收契约；不另建账本或调度流程。
- 主控负责需求、规划、派工、验收和交接，不读改业务源码、不运行项目构建或测试；这些交给执行者。只收结构化短回执与实际验证证据，长日志留在子代理。
- 一次性任务与持续负责人均通过 subagent 创建并用 send_message 续接，确需继承已完成对话才用 subagent_fork。teammate 轨省略模型选择字段；其余路由以配置和 list_subagent_models 为准，目标未公布推理档位时省略 reasoning_effort，不填 none、default 或空串。状态与收尾用 list_agents、interrupt_agent、wait_agent，确认真实停止后再记暂停。
- 日常非项目问答直接回答；动态项目状态与简报留在对话和项目文件，不改写固定系统提示。`;

export const SECTIONS = {
  'genui:fence': {order: 700, text: '需要结构化展示时启用 ui 工具组，格式细节按需读取 genui 技能；普通文字直接回答。'},
  'agency:experts': {order: 117, text: '用户点名专家或团队时启用 agents 工具组并召唤；团队先 get_expert_team。创建专家先展示草案，确认后打开编辑器。'},
  'agency:teams': {order: 118, text: ''},
  'free-search:engines': {order: 500, text: '检索沿用当前配置的引擎；需要正文再 web_fetch，引用使用的来源。平台、时限等专用检索可启用 search 工具组。'},
};
