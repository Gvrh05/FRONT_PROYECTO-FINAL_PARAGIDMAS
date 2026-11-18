// Live CRUD smoke: only creates/deletes its own uniquely named questionnaire.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const origin = process.env.VERIFY_ORIGIN || 'http://localhost:5173';
const config = Object.fromEntries(fs.readFileSync(process.env.VERIFY_ENV_FILE, 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let quizId, token;
  try {
    const page = await browser.newPage();
    const title = `CRUD smoke ${Date.now()}`;
    await page.goto(origin + '/login');
    await page.getByLabel('Usuario', { exact: true }).fill(config.DEMO_USER_USERNAME || 'profesor_test');
    await page.getByLabel('Contraseña', { exact: true }).fill(config.DEMO_USER_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.waitForURL('**/dashboard');
    token = await page.evaluate(() => sessionStorage.getItem('token'));
    await page.getByRole('button', { name: 'Nuevo cuestionario', exact: true }).click();
    await page.getByLabel('Título', { exact: true }).fill(title);
    const created = page.waitForResponse(r => r.url().endsWith('/kahoot-api/quizzes') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Guardar cuestionario', exact: true }).click();
    const response = await created;
    assert(response.ok());
    quizId = (await response.json()).id;
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Editar cuestionario', exact: true }).click();
    await page.getByLabel('Título', { exact: true }).fill(title + ' editado');
    await page.getByRole('button', { name: 'Guardar cuestionario', exact: true }).click();
    await page.getByRole('heading', { name: title + ' editado', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Volver al listado', exact: true }).click();
    const item = page.locator('.quiz-item').filter({ hasText: title });
    await item.getByRole('button', { name: 'Abrir', exact: true }).click();
    await page.getByRole('heading', { name: title + ' editado', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Volver al listado', exact: true }).click();
    await item.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
    await item.waitFor({ state: 'detached' });
    quizId = undefined;
    console.log('PASS live browser: Crear, Guardar, Editar, Volver, Abrir and Eliminar via Vite proxy.');
  } finally {
    if (quizId && token) await fetch(`${origin}/kahoot-api/quizzes/${quizId}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    await browser.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
