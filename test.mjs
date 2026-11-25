import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {apply} from './runtime.js';
import {DIRECTOR_SECTION, SECTIONS, GROUPS, CORE_EXCEPTIONS} from './policy.js';

const require = createRequire(join(process.env.DSH_INSTALL_DIR, 'package.json'));
const {parseDocument} = require('yaml');
const patch = parseDocument(readFileSync(new URL('./cordis.patch.yml', import.meta.url), 'utf8'), {
  customTags: [{tag: 'tag:yaml.org,2002:js', resolve: value => value}],
});
assert.equal(patch.errors.length, 0);
const preset = patch.contents.items[0].get('insert', true).items[0].get('config', true);
assert.equal(preset.get('id'), 'zaoyu');
assert.equal(preset.get('name'), '早鱼');
const plugins = preset.get('plugins', true).items;
const prefix = plugins.find(row => row.get('id') === 'persona').get('config', true).get('prefix');
assert(prefix.includes('项目的首席技术指挥兼顶尖研究员'));
assert(prefix.includes('【性格与搭档感】'));
assert(prefix.includes('【指挥与工程交付】'));
assert(prefix.endsWith('个性互动仅留在外围交流，绝不污染正文。'));
const delegation = plugins.find(row => row.get('id') === 'delegation').get('config', true).items;
assert(!delegation.some(row => row.get('id') === 'tool-teammate'));
assert.equal(delegation.find(row => row.get('id') === 'tool-subagent-control').get('config', true).get('interrupt'), true);
assert.equal(delegation.find(row => row.get('id') === 'tool-subagent').get('config', true).get('modelSelection'), true);
assert(!Object.hasOwn(GROUPS, 'extra'));
assert(!Object.hasOwn(SECTIONS, 'armor-switch:contract'));
assert(!Object.hasOwn(SECTIONS, 'armor-switch:preferences'));
for (const tool of ['mnemon_recall', 'mnemon_document_search', 'mnemon_view_route', 'mnemon_view_action']) {
  assert(CORE_EXCEPTIONS.has(tool), tool);
}

const tempRoot = mkdtempSync(join(tmpdir(), 'zaoyu-test-'));
const plainDir = join(tempRoot, 'plain');
const studioDir = join(tempRoot, 'studio');
mkdirSync(plainDir, {recursive: true});
mkdirSync(join(studioDir, '.studio'), {recursive: true});
writeFileSync(join(studioDir, '.studio', 'state.json'), '{"name":"demo","paused":false,"tasks":[],"inbox":[]}');

try {
  function fixture(presetName, parentSession, cwd = plainDir) {
    const definitions = new Map(['read', 'write', 'apply_patch', 'web_search', 'advanced_search', 'plugin_manager',
      'codex_image_generate', 'mnemon_recall', 'mnemon_forget', 'subagent_fork', 'render_ui',
      'bsk_session', 'schedule_create', 'subagent', 'send_message', 'list_agents',
      'interrupt_agent', 'wait_agent', 'list_subagent_models']
      .map(name => [name, {name, description: name, parameters: {type: 'object'}}]));
    let denyMask;
    let restrictions = 0;
    const sections = new Map([
      ['deployment:persona-prefix', {text: presetName === 'zaoyu' ? prefix : presetName}],
      ['armor-switch:contract', {text: 'ACTIVE_ARMOR_CONTRACT'}],
    ]);
    const contexts = new Map([['armor-switch:authority', {text: 'ACTIVE_ARMOR_AUTHORITY'}]]);
    const ac = {
      effect: callback => callback(),
      tools: {
        definitions: () => [...definitions.values()].filter(tool => tool.name === 'zaoyu_tools' || !denyMask || !denyMask.has(tool.name)),
        schemas: () => ac.tools.definitions().map(({name, description, parameters}) => ({name, description, parameters})),
        restrict({allow, deny}) {
          restrictions++;
          const allowSet = allow ? new Set(allow) : null;
          const denySet = deny ? new Set(deny) : null;
          denyMask = new Set([...definitions.keys()].filter(name => (allowSet && !allowSet.has(name)) || (denySet && denySet.has(name))));
          return () => {denyMask = undefined;};
        },
        register(tool) {definitions.set(tool.name, tool); return () => definitions.delete(tool.name);},
      },
      systemPrompt: {
        section(section) {assert(!sections.has(section.name), `should not shadow ${section.name}`); sections.set(section.name, section); return () => sections.delete(section.name);},
        context(context) {assert(!contexts.has(context.name), `should not shadow ${context.name}`); contexts.set(context.name, context); return () => contexts.delete(context.name);},
      },
    };
    return {agent: {ctx: ac, session: {preset: presetName, header: {parentSession, cwd}}}, definitions, sections, contexts, get restrictions() {return restrictions;}};
  }
  const cleanups = [];
  const listeners = new Map();
  apply({
    agentPresets: {presetForSession: session => session.preset},
    get: name => (name === 'workingDirectory' ? {get: session => session.header.cwd} : undefined),
    on: (name, callback) => listeners.set(name, callback),
    effect: callback => cleanups.push(callback()),
  });
  assert(!listeners.has('agent/created'));
  const preStep = listeners.get('agent/pre-step');
  const decision = Symbol('forwarded decision');
  const run = async ({agent}) => assert.equal(await preStep({agent}, () => Promise.resolve(decision)), decision);
  const zaoyuPlain = fixture('zaoyu', undefined, plainDir);
  const zaoyuStudio = fixture('zaoyu', undefined, studioDir);
  const xianhua = fixture('xianhua');
  const child = fixture('zaoyu', 'parent-session', studioDir);
  for (const item of [zaoyuPlain, zaoyuStudio, xianhua, child, zaoyuPlain]) await run(item);

  const names = () => zaoyuPlain.agent.ctx.tools.schemas().map(tool => tool.name);
  assert.deepEqual(names().sort(), ['read', 'write', 'apply_patch', 'web_search', 'mnemon_recall', 'subagent',
    'subagent_fork', 'send_message', 'list_agents', 'interrupt_agent', 'wait_agent',
    'list_subagent_models', 'zaoyu_tools'].sort());
  const maskCount = zaoyuPlain.restrictions;
  await run(zaoyuPlain);
  assert.equal(zaoyuPlain.restrictions, maskCount, 'unchanged tool registry does not rebuild the mask');
  assert(!xianhua.definitions.has('zaoyu_tools'));
  assert(!child.definitions.has('zaoyu_tools'));
  assert.equal(zaoyuPlain.sections.get('deployment:persona-prefix').text, prefix);
  // Armor-switch sections and contexts stay untouched
  assert.equal(zaoyuPlain.sections.get('armor-switch:contract').text, 'ACTIVE_ARMOR_CONTRACT');
  assert.equal(zaoyuPlain.contexts.get('armor-switch:authority').text, 'ACTIVE_ARMOR_AUTHORITY');
  // Director section activates dynamically only when .studio/state.json exists
  assert.equal(zaoyuPlain.sections.get('zaoyu:director').text(), '');
  assert.equal(zaoyuStudio.sections.get('zaoyu:director').text(), DIRECTOR_SECTION);
  assert(!xianhua.sections.has('zaoyu:director'));
  assert(!child.sections.has('zaoyu:director'));

  const switchedIn = fixture('xianhua');
  switchedIn.agent.session.preset = 'zaoyu';
  await run(switchedIn);
  assert(switchedIn.definitions.has('zaoyu_tools'));
  const switchedOut = fixture('zaoyu');
  switchedOut.agent.session.preset = 'xianhua';
  await run(switchedOut);
  assert(!switchedOut.definitions.has('zaoyu_tools'));

  const expand = zaoyuPlain.definitions.get('zaoyu_tools');
  const schemas = JSON.stringify(zaoyuPlain.agent.ctx.tools.schemas());
  const initialStatus = await expand.execute({groups: []});
  assert.equal(zaoyuPlain.restrictions, maskCount);
  assert.equal(JSON.stringify(zaoyuPlain.agent.ctx.tools.schemas()), schemas);
  assert.deepEqual(initialStatus.groups.admin.tools, ['plugin_manager']);
  assert.equal(initialStatus.groups.admin.count, 1);

  await expand.execute({groups: ['admin']});
  assert(names().includes('plugin_manager'));
  assert.deepEqual((await expand.execute({groups: []})).active, ['admin']);
  assert.equal(zaoyuPlain.restrictions, maskCount + 1);

  const addBrowserTool = zaoyuPlain.agent.ctx.tools.register({name: 'bsk_new', parameters: {type: 'object'}});
  listeners.get('tools/change')();
  await run(zaoyuPlain);
  let browser = (await expand.execute({groups: []})).groups.browser;
  assert.deepEqual(browser.tools.sort(), ['bsk_new', 'bsk_session']);
  assert.deepEqual(browser.visible, []);
  await expand.execute({groups: ['browser']});
  browser = (await expand.execute({groups: []})).groups.browser;
  assert.deepEqual(browser.visible.sort(), ['bsk_new', 'bsk_session']);
  addBrowserTool();
  listeners.get('tools/change')();
  await run(zaoyuPlain);
  assert.deepEqual((await expand.execute({groups: []})).groups.browser.tools, ['bsk_session']);

  // Expanding all groups leaves hidden=[] -> no empty restrict call
  await expand.execute({groups: Object.keys(GROUPS)});
  assert(names().includes('codex_image_generate'));

  await expand.execute({groups: ['images'], reset: true});
  assert(!names().includes('plugin_manager'));
  assert(names().includes('codex_image_generate'));
  assert(names().includes('apply_patch'));

  for (const cleanup of cleanups.reverse()) cleanup();
  assert.equal(zaoyuPlain.agent.ctx.tools.schemas().length, 19);
  assert.equal(zaoyuPlain.sections.size, 2);
  console.log(JSON.stringify({
    passed: true,
    armorSwitchPassthrough: true,
    schemeAUnknownVisible: true,
    groupToolNamesExposed: true,
    conditionalDirector: true,
    noCreationHook: true,
    commanderToolsAlwaysVisible: true,
    childrenUntouched: true,
    toolExpansionAndReset: true,
  }));
} finally {
  rmSync(tempRoot, {recursive: true, force: true});
}
