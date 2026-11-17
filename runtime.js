import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {GROUPS, groupOf, hiddenNames, DIRECTOR_SECTION, SECTIONS} from './policy.js';

export const name = 'zaoyu-lite';
export const inject = ['agentPresets', 'tools', 'systemPrompt'];

function isStudioProject(ctx, agent) {
  try {
    const cwd = ctx.get?.('workingDirectory')?.get?.(agent.session) ?? agent.session?.header?.cwd;
    return typeof cwd === 'string' && cwd.length > 0 && existsSync(join(cwd, '.studio', 'state.json'));
  } catch {
    return false;
  }
}

export function apply(ctx) {
  const installed = new Map();
  function attach(agent) {
    if (ctx.agentPresets.presetForSession(agent.session) !== 'zaoyu'
      || agent.session.header.parentSession !== undefined || installed.has(agent)) return;
    const dispose = agent.ctx.effect(() => {
      const ac = agent.ctx;
      const active = new Set();
      const original = ac.tools.schemas(agent);
      const before = {tools: original.length, schemaChars: JSON.stringify(original).length};
      let release = () => {};
      let definitions = [];
      const cleanups = [];
      function select(groups, reset) {
        release();
        if (reset) active.clear();
        for (const group of groups) active.add(group);
        definitions = ac.tools.definitions(agent).filter(tool => tool.name !== 'zaoyu_tools');
        const hidden = hiddenNames(definitions, active);
        release = hidden.length ? ac.tools.restrict({deny: hidden}) : () => {};
      }
      function status() {
        const schemas = ac.tools.schemas(agent);
        return {
          active: [...active], before,
          current: {tools: schemas.length, schemaChars: JSON.stringify(schemas).length},
          groups: Object.fromEntries(Object.entries(GROUPS).map(([key, label]) => {
            const tools = definitions.filter(tool => groupOf(tool.name) === key).map(tool => tool.name);
            return [key, {label, count: tools.length, tools}];
          })),
        };
      }
      select([], false);
      cleanups.push(ac.tools.register({
        name: 'zaoyu_tools',
        description: '按需展开早鱼的扩展工具组，开启后在本会话保留。groups=[]仅查看状态及各组工具名，不改变工具；reset=true明确复位后启用所选组，不用完即复位。',
        parameters: {
          type: 'object', properties: {
            groups: {type: 'array', items: {type: 'string', enum: Object.keys(GROUPS)}, description: 'search检索、browser浏览器、memory记忆管理、agents专家工作流、images图片、office办公、schedule定时、ui展示、admin插件。'},
            reset: {type: 'boolean'},
          }, required: ['groups'], additionalProperties: false,
        },
        output: {
          schema: {type: 'object', additionalProperties: true},
          render: (_args, value) => [{type: 'text', text: JSON.stringify(value)}],
        },
        async execute({groups, reset = false}) {
          if (reset || groups.length) select(groups, reset);
          return status();
        },
      }));
      cleanups.push(ac.systemPrompt.section({
        name: 'zaoyu:director', order: 4,
        text: () => (isStudioProject(ctx, agent) ? DIRECTOR_SECTION : ''),
        interpolate: false,
      }));
      for (const [name, section] of Object.entries(SECTIONS)) {
        cleanups.push(ac.systemPrompt.section({name, ...section, interpolate: false}));
      }
      cleanups.push(ac.systemPrompt.section({
        name: 'zaoyu:tools', order: 5,
        text: '常用工具及未折叠基础工具直接调用。需要扩展能力时调用 zaoyu_tools 启用对应组；助手自行选择，无需用户记工具名。',
        interpolate: false,
      }));
      return () => {
        release();
        for (const cleanup of cleanups.reverse()) cleanup();
        installed.delete(agent);
      };
    });
    installed.set(agent, dispose);
  }
  ctx.on('agent/pre-step', ({agent}, next) => {
    attach(agent);
    return next();
  });
  ctx.effect(() => () => {
    for (const dispose of installed.values()) dispose();
    installed.clear();
  });
}
