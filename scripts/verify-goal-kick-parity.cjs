// Run after backend build. No production import crosses repository boundaries.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const moduleObject = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features/goal-kick/physics.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code, { exports: moduleObject.exports });
const front = moduleObject.exports;
const back = require('../../BACKEND_PROYECTO-FINAL-PARADIGMAS/dist/modules/game-session/engine/goal-kick-physics');
assert.equal(JSON.stringify(front.PHYSICS), JSON.stringify(back.PHYSICS));
let cases = 0;
for (const defenders of [[], [{ id: 'a', x: 320, y: 340 }, { id: 'b', x: 650, y: 400 }], [{ id: 'a', x: 477, y: 340 }]]) {
  for (const x of [200, 250, 272, 400, 500, 600, 728, 750, 800]) for (const k of [-260, -195, -65, 0, 65, 195, 260]) {
    const c = back.trajectory(x, k);
    assert.equal(JSON.stringify(front.trajectory(x, k)), JSON.stringify(c));
    for (const u of [0, .1, .25, .5, .75, .9, 1]) assert.equal(JSON.stringify(front.bezier(c, u)), JSON.stringify(back.bezier(c, u)));
    assert(Math.abs(front.previewContact(c, defenders) - back.resolveShot(c, defenders).contactU) < 1e-10);
    cases++;
  }
}
console.log(`PASS physics parity v1: ${cases} trajectories, exact Bézier points and swept collision contact. No server started.`);
