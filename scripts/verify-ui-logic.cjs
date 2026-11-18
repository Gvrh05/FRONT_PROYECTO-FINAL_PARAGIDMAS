// Compare presentation edits against the incoming merge parent, using TypeScript AST.
// While merging: node scripts/verify-ui-logic.cjs MERGE_HEAD
// After the merge commit: node scripts/verify-ui-logic.cjs HEAD^2
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const ts = require('typescript');
const base = process.argv[2] || 'MERGE_HEAD';
const components = ['src/App.tsx', 'src/components/LoginForm.tsx', 'src/pages/DashboardPage.tsx', 'src/pages/HostLobbyPage.tsx', 'src/pages/GuestJoinPage.tsx', 'src/pages/RegisterPage.tsx'];
const connections = ['src/realtime/socket.ts', 'src/realtime/useSessionLobby.ts'];
const printer = ts.createPrinter({ removeComments: true });
function parse(text) { return ts.createSourceFile('view.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function snapshot(text) {
  const ast = parse(text), ranges = [], handlers = [], hooks = [];
  function inspect(node) {
    if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText(ast)) && node.initializer) handlers.push(node.name.getText(ast) + ':' + printer.printNode(ts.EmitHint.Unspecified, node.initializer, ast));
    if (ts.isCallExpression(node) && /^use[A-Z]/.test(node.expression.getText(ast))) hooks.push(printer.printNode(ts.EmitHint.Unspecified, node, ast));
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
  function jsx(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) { ranges.push([node.getStart(ast), node.end]); return; }
    ts.forEachChild(node, jsx);
  }
  jsx(ast);
  let logic = text;
  for (const [start, end] of ranges.sort((a,b) => b[0] - a[0])) logic = logic.slice(0,start) + '__VIEW__' + logic.slice(end);
  const clean = parse(logic), functions = [];
  function declarations(node) {
    if (ts.isFunctionDeclaration(node)) functions.push(printer.printNode(ts.EmitHint.Unspecified, node, clean));
    ts.forEachChild(node, declarations);
  }
  declarations(clean);
  return { functions: functions.sort(), handlers: handlers.sort(), hooks: hooks.sort() };
}
for (const path of components) {
  const previous = execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' });
  const before = snapshot(previous), after = snapshot(fs.readFileSync(path,'utf8'));
  assert.deepEqual(after, before, `${path}: non-visual function, hook or event handler changed`);
  console.log(`PASS ${path}: ${after.functions.length} functions, ${after.hooks.length} hooks, ${after.handlers.length} handlers intact`);
}
for (const path of connections) {
  const previous = execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' }).replace(/\r\n/g,'\n');
  assert.equal(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n'), previous, `${path}: connection logic differs`);
  console.log(`PASS ${path}: connection and socket logic unchanged`);
}
