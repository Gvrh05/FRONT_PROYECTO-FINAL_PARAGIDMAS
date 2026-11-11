// Run against an isolated stack. Set PLAYWRIGHT_MODULE and VERIFY_ENV_FILE.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const origin = process.env.VERIFY_ORIGIN || 'http://localhost:45173';
const config = Object.fromEntries(fs.readFileSync(process.env.VERIFY_ENV_FILE, 'utf8').split(/\r?\n/).filter((line) => /^[A-Z_]+=/.test(line)).map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
let browser, token, quizId, user, teacherToken, webUsername;
async function api(path, method = 'GET', body, credential = token) {
  const response = await fetch(origin + path, { method, headers: { ...(credential && { authorization: `Bearer ${credential}` }), ...(body && { 'content-type': 'application/json' }) }, ...(body && { body: JSON.stringify(body) }) });
  assert(response.ok, `${method} ${path} returned ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
async function main() {
  token = (await api('/auth/login', 'POST', { username: config.DEMO_USER_USERNAME || 'profesor_test', password: config.DEMO_USER_PASSWORD }, null)).accessToken;
  const password = crypto.randomBytes(16).toString('hex');
  user = await api('/auth/users', 'POST', { username: 'web_' + crypto.randomBytes(4).toString('hex'), password });
  const teacher = (await api('/auth/login', 'POST', { username: user.username, password }, null)).accessToken;
  teacherToken = teacher;
  const quiz = await api('/kahoot-api/quizzes', 'POST', { title: 'Browser guest acceptance' }, teacher);
  quizId = quiz.id;
  await api(`/kahoot-api/quizzes/${quiz.id}/questions`, 'POST', { kind: 'TRUE_FALSE', questionText: 'El agua existe.', timeLimitSeconds: 15, options: [{ text: 'Verdadero', isCorrect: true }, { text: 'Falso', isCorrect: false }] }, teacher);
  const room = await api('/kahoot-api/game-sessions', 'POST', { quizId: quiz.id }, teacher);
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const hostContext = await browser.newContext();
  const host = await hostContext.newPage();
  const errors = [];
  host.on('pageerror', (error) => errors.push(error.message));
  await host.goto(origin + '/login');
  await host.getByLabel('Usuario', { exact: true }).fill(user.username);
  await host.getByLabel('Contraseña', { exact: true }).fill(password);
  await host.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await host.waitForURL('**/dashboard');
  await host.goto(origin + '/host/lobby/' + room.roomCode);
  const link = host.locator(`a[href$="/join/${room.invitationId}"]`);
  await link.waitFor();
  assert.equal(await link.getAttribute('href'), origin + '/join/' + room.invitationId);
  assert.equal(await host.locator('svg').count(), 1);
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guest = await guestContext.newPage();
  guest.on('pageerror', (error) => errors.push(error.message));
  await guest.goto(origin + '/join/' + room.invitationId);
  await guest.getByLabel('Tu nombre').fill('Estudiante móvil');
  await guest.getByRole('button', { name: 'Entrar', exact: true }).click();
  await guest.getByRole('status').filter({ hasText: /^Conectado$/ }).waitFor();
  await guest.getByText('Estudiante móvil', { exact: true }).first().waitFor();
  await host.getByText('Estudiante móvil', { exact: true }).waitFor();
  const stored = await guest.evaluate(() => JSON.stringify(sessionStorage));
  assert(!await guest.evaluate(() => localStorage.getItem('token')));
  await guest.reload();
  await guest.getByRole('status').filter({ hasText: /^Conectado$/ }).waitFor();
  assert.equal(await guest.evaluate(() => JSON.stringify(sessionStorage)), stored);
  await api(`/kahoot-api/game-sessions/${room.roomCode}/start`, 'POST', undefined, teacher);
  await guest.getByRole('button', { name: /Verdadero/ }).click();
  await guest.getByText(/Respuesta enviada|Respuesta registrada|respondido/i).first().waitFor({ timeout: 10000 });
  await guest.reload();
  await guest.getByText('El agua existe.', { exact: true }).waitFor();
  assert.equal(await guest.getByRole('link', { name: 'Dashboard', exact: true }).count(), 0);
  assert.equal(await guest.getByRole('button', { name: 'Salir de la partida', exact: true }).count(), 1);
  await host.goto(origin + '/users');
  await host.waitForURL('**/dashboard');
  await host.getByRole('button', { name: 'Cerrar sesión', exact: true }).first().click();
  await host.waitForURL('**/login');
  assert(!await host.evaluate(() => localStorage.getItem('token')));
  await host.getByLabel('Usuario', { exact: true }).fill(config.DEMO_USER_USERNAME || 'profesor_test');
  await host.getByLabel('Contraseña', { exact: true }).fill(config.DEMO_USER_PASSWORD);
  await host.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await host.waitForURL('**/dashboard');
  await host.goto(origin + '/users');
  await host.getByRole('heading', { name: 'Crear profesor', exact: true }).waitFor();
  const masterToken = await host.evaluate(() => localStorage.getItem('token'));
  webUsername = 'ui_' + crypto.randomBytes(4).toString('hex');
  await host.getByLabel('Nombre de usuario', { exact: true }).fill(webUsername);
  await host.getByLabel('Contraseña', { exact: true }).fill(password);
  await host.getByRole('button', { name: 'Guardar', exact: true }).click();
  await host.getByText(webUsername, { exact: true }).waitFor();
  assert.equal(await host.evaluate(() => localStorage.getItem('token')), masterToken);
  await host.goto(origin + '/quizzes');
  const demoDelete = host.getByRole('button', { name: 'Eliminar', exact: true });
  await demoDelete.first().waitFor();
  assert(await demoDelete.count() > 0);
  assert(await demoDelete.first().isDisabled());
  assert.deepEqual(errors, []);
  console.log('PASS browser: MASTER creates teacher without session replacement, demo controls, account switch/logout, protected users, local QR/link, anonymous mobile guest, lobby, answer and reload');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  if (token && user) {
    if (quizId && teacherToken) await api(`/kahoot-api/quizzes/${quizId}`, 'DELETE', undefined, teacherToken).catch(() => undefined);
    await api(`/auth/users/${user.id}`, 'PATCH', { active: false }).catch(() => undefined);
  }
  if (token && webUsername) {
    const list = await api('/auth/users?limit=100').catch(() => null);
    const webUser = list?.items?.find((item) => item.username === webUsername);
    if (webUser) await api(`/auth/users/${webUser.id}`, 'PATCH', { active: false }).catch(() => undefined);
  }
});
