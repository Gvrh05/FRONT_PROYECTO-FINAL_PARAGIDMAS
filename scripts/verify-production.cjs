const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function verifyProductionBundle() {
  const assets = path.resolve(__dirname, '../dist/assets');
  const files = fs.readdirSync(assets).filter((name) => name.endsWith('.js'));
  assert(files.length > 0, 'Run pnpm build before checking production assets');
  const js = files.map((name) => fs.readFileSync(path.join(assets, name), 'utf8')).join('\n');
  for (const excluded of ['super_secret_jwt_key_change_in_production', 'DEV ONLY', 'test-host-id', 'test-player-id', 'pnpm seed', 'dev-login']) {
    assert(!js.includes(excluded), `Production bundle leaked ${excluded}`);
  }
  assert(js.includes('Aún no tienes cuestionarios. Crea uno con preguntas de Verdadero/Falso para iniciar una partida.'));
  console.log('PASS producción: sin IDs, instrucciones seed, ruta dev-login, botones ni clave pública de demo; estado vacío genérico.');
}

module.exports = verifyProductionBundle;
if (require.main === module) {
  try { verifyProductionBundle(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
